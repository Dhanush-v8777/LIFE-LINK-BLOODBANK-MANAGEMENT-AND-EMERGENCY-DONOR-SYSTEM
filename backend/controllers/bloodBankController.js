const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');
const { sendEmail } = require('../config/mail');
const { getLowStockAlertEmail } = require('../utils/emailTemplates');

// Helper to determine expiry days based on blood component
function getExpiryDays(component) {
  switch (component) {
    case 'Platelets': return 5;
    case 'Whole Blood': return 35;
    case 'RBC': return 42;
    case 'Plasma': return 365;
    default: return 35;
  }
}

exports.getInventoryDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Resolve Blood Bank ID for the logged-in staff member
    const [banks] = await db.query('SELECT * FROM blood_banks WHERE user_id = ?', [userId]);
    if (banks.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood Bank profile not found' });
    }
    const bank = banks[0];

    // 2. Query Blood Group Wise Stock Sum
    const [stockSummary] = await db.query(
      `SELECT blood_group, component, SUM(volume_ml * units) as total_volume, SUM(units) as units_count 
       FROM blood_inventory 
       WHERE blood_bank_id = ? AND status = 'Available' AND expiry_date >= CURDATE()
       GROUP BY blood_group, component`,
      [bank.id]
    );

    // 3. Low stock alerts (e.g. Component volume < 1000ml in total)
    const criticalThreshold = 1000;
    const [lowStockAlerts] = await db.query(
      `SELECT blood_group, component, SUM(volume_ml * units) as total_volume 
       FROM blood_inventory 
       WHERE blood_bank_id = ? AND status = 'Available' AND expiry_date >= CURDATE()
       GROUP BY blood_group, component
       HAVING total_volume < ?`,
      [bank.id, criticalThreshold]
    );

    // 4. Expiry log (expiring in next 7 days)
    const [expiringUnits] = await db.query(
      `SELECT * FROM blood_inventory 
       WHERE blood_bank_id = ? AND status = 'Available' AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY expiry_date ASC`,
      [bank.id]
    );

    // 5. Active donation scheduling lists
    const [scheduledDonations] = await db.query(
      `SELECT d.*, u.name as donor_name, dn.blood_group 
       FROM donations d 
       JOIN donors dn ON d.donor_id = dn.id
       JOIN users u ON dn.user_id = u.id
       WHERE d.blood_bank_id = ? AND d.status = 'Scheduled'
       ORDER BY d.donation_date ASC`,
      [bank.id]
    );

    // 6. Recent testing queue
    const [completedDonationsWithoutTests] = await db.query(
      `SELECT d.*, u.name as donor_name, dn.blood_group 
       FROM donations d 
       JOIN donors dn ON d.donor_id = dn.id
       JOIN users u ON dn.user_id = u.id
       LEFT JOIN blood_tests t ON d.id = t.donation_id
       WHERE d.blood_bank_id = ? AND d.status = 'Completed' AND t.id IS NULL
       ORDER BY d.donation_date DESC`,
      [bank.id]
    );

    return res.status(200).json({
      success: true,
      bank,
      stockSummary,
      lowStockAlerts,
      expiringUnits,
      scheduledDonations,
      completedDonationsWithoutTests
    });
  } catch (error) {
    console.error('Inventory dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve blood bank dashboard details' });
  }
};

exports.getInventoryList = async (req, res) => {
  const userId = req.user.id;

  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    if (banks.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood bank not found' });
    }

    const [inventory] = await db.query(
      `SELECT * FROM blood_inventory 
       WHERE blood_bank_id = ? AND status != 'Distributed' 
       ORDER BY expiry_date ASC`,
      [banks[0].id]
    );

    return res.status(200).json({ success: true, inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

exports.addInventoryUnit = async (req, res) => {
  const userId = req.user.id;
  const { bloodGroup, component, volumeMl, units, expiryDate } = req.body;

  if (!bloodGroup || !component || !volumeMl || !units) {
    return res.status(400).json({ success: false, message: 'Blood group, component, volume per unit, and units are required' });
  }

  // Validate positive numbers
  if (parseInt(volumeMl) <= 0 || parseInt(units) <= 0) {
    return res.status(400).json({ success: false, message: 'Volume and Units must be positive numbers' });
  }

  try {
    const [banks] = await db.query('SELECT id, name FROM blood_banks WHERE user_id = ?', [userId]);
    const bank = banks[0];

    // Calculate expiry if not provided
    let expDate = expiryDate;
    if (!expDate) {
      const days = getExpiryDays(component);
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + days);
      expDate = dateObj.toISOString().split('T')[0];
    }

    await db.query(
      `INSERT INTO blood_inventory (blood_bank_id, blood_group, component, volume_ml, units, status, expiry_date) 
       VALUES (?, ?, ?, ?, ?, 'Available', ?)`,
      [bank.id, bloodGroup, component, volumeMl, units, expDate]
    );

    await logAudit(userId, 'Inventory Unit Added', req, `${component} ${bloodGroup} (${units} units x ${volumeMl}ml), Expire: ${expDate}`);

    // Check if after adding, component volume is still below threshold (for sending inventory alert logic if it was critical)
    const [totals] = await db.query(
      `SELECT SUM(volume_ml * units) as total_volume 
       FROM blood_inventory 
       WHERE blood_bank_id = ? AND blood_group = ? AND component = ? AND status = 'Available' AND expiry_date >= CURDATE()`,
      [bank.id, bloodGroup, component]
    );
    const updatedVolume = totals[0].total_volume || 0;

    if (updatedVolume < 1000) {
      // Trigger low stock email alert to staff
      try {
        const [staff] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        const emailHtml = getLowStockAlertEmail(bank.name, bloodGroup, component, updatedVolume);
        await sendEmail({
          to: staff[0].email,
          subject: `LOW STOCK ALERT: ${component} ${bloodGroup}`,
          html: emailHtml
        });
      } catch (mailErr) {
        console.error('Failed to dispatch low stock email alert:', mailErr);
      }
    }

    return res.status(201).json({ success: true, message: 'Blood inventory unit registered successfully' });
  } catch (error) {
    console.error('Add inventory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register blood unit' });
  }
};

exports.updateInventoryUnit = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { bloodGroup, component, volumeMl, units, status, expiryDate } = req.body;

  if (!bloodGroup || !component || !volumeMl || !units || !status || !expiryDate) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Validate positive numbers
  if (parseInt(volumeMl) <= 0 || parseInt(units) <= 0) {
    return res.status(400).json({ success: false, message: 'Volume and Units must be positive numbers' });
  }

  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    const bankId = banks[0].id;

    await db.query(
      `UPDATE blood_inventory 
       SET blood_group = ?, component = ?, volume_ml = ?, units = ?, status = ?, expiry_date = ? 
       WHERE id = ? AND blood_bank_id = ?`,
      [bloodGroup, component, volumeMl, units, status, expiryDate, id, bankId]
    );

    await logAudit(userId, 'Inventory Unit Updated', req, `Unit ID: ${id} updated to ${status}`);
    return res.status(200).json({ success: true, message: 'Blood unit details updated successfully' });
  } catch (error) {
    console.error('Update inventory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update blood unit details' });
  }
};

exports.deleteInventoryUnit = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    const bankId = banks[0].id;

    await db.query('DELETE FROM blood_inventory WHERE id = ? AND blood_bank_id = ?', [id, bankId]);
    await logAudit(userId, 'Inventory Unit Deleted', req, `Deleted Unit ID: ${id}`);

    return res.status(200).json({ success: true, message: 'Blood unit removed successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove blood unit' });
  }
};

exports.addBloodTestRecord = async (req, res) => {
  const userId = req.user.id;
  const { donationId, testResults, status } = req.body; // status: 'Passed', 'Failed'

  if (!donationId || !testResults || !status) {
    return res.status(400).json({ success: false, message: 'Donation ID, test results (JSON) and status are required' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get donation details
    const [donations] = await connection.execute(
      `SELECT d.*, dn.blood_group 
       FROM donations d 
       JOIN donors dn ON d.donor_id = dn.id 
       WHERE d.id = ?`,
      [donationId]
    );
    if (donations.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }
    const donation = donations[0];

    // 2. Insert test record
    await connection.execute(
      'INSERT INTO blood_tests (donation_id, test_date, blood_group, test_results, status) VALUES (?, CURDATE(), ?, ?, ?)',
      [donationId, donation.blood_group, JSON.stringify(testResults), status]
    );

    // 3. Update donation status
    await connection.execute(
      'UPDATE donations SET status = ? WHERE id = ?',
      [status === 'Passed' ? 'Completed' : 'Cancelled', donationId]
    );

    // 4. If test passed, add Whole Blood to inventory!
    if (status === 'Passed') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 35); // 35 days for whole blood
      const expiryStr = expiry.toISOString().split('T')[0];

      await connection.execute(
        `INSERT INTO blood_inventory (blood_bank_id, blood_group, component, volume_ml, units, status, expiry_date) 
         VALUES (?, ?, 'Whole Blood', ?, 1, 'Available', ?)`,
        [donation.blood_bank_id, donation.blood_group, donation.volume_ml, expiryStr]
      );
    }

    // 5. Update Donor last_donation_date if passed
    if (status === 'Passed') {
      await connection.execute(
        'UPDATE donors SET last_donation_date = CURDATE() WHERE id = ?',
        [donation.donor_id]
      );
    }

    await connection.commit();
    connection.release();

    await logAudit(userId, 'Blood Test Logged', req, `Donation ID: ${donationId}, Test Outcome: ${status}`);

    return res.status(201).json({ success: true, message: 'Blood testing records updated successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Blood testing error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register test record' });
  }
};

exports.registerDonationCollection = async (req, res) => {
  const userId = req.user.id;
  const { donorId, volumeMl } = req.body;

  if (!donorId || !volumeMl) {
    return res.status(400).json({ success: false, message: 'Donor ID and volume are required' });
  }

  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    const bankId = banks[0].id;

    // Check if donor is eligible (no donation in last 3 months)
    const [donors] = await db.query('SELECT last_donation_date FROM donors WHERE id = ?', [donorId]);
    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    const donor = donors[0];

    if (donor.last_donation_date) {
      const lastDate = new Date(donor.last_donation_date);
      const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + 3));
      if (new Date() < nextDate) {
        return res.status(400).json({
          success: false,
          message: `Donor is not eligible. Next eligible donation date: ${nextDate.toISOString().split('T')[0]}`
        });
      }
    }

    // Create a Completed Donation record
    // In our flow: donation is collected, then sent to testing queue.
    const [result] = await db.query(
      `INSERT INTO donations (donor_id, blood_bank_id, donation_date, volume_ml, status) 
       VALUES (?, ?, CURDATE(), ?, 'Completed')`,
      [donorId, bankId, volumeMl]
    );

    await logAudit(userId, 'Donation Registered', req, `Donation ID: ${result.insertId} registered for Donor ID: ${donorId}`);

    return res.status(201).json({
      success: true,
      message: 'Donation collection logged. The unit is now queued for testing.',
      donationId: result.insertId
    });
  } catch (error) {
    console.error('Register donation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
};

exports.getExpiredUnits = async (req, res) => {
  const userId = req.user.id;

  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    const bankId = banks[0].id;

    // Fetch expired inventory
    const [expired] = await db.query(
      `SELECT * FROM blood_inventory 
       WHERE blood_bank_id = ? AND (expiry_date < CURDATE() OR status = 'Expired')`,
      [bankId]
    );

    return res.status(200).json({ success: true, expired });
  } catch (error) {
    console.error('Get expired units error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.cleanExpiredInventory = async (req, res) => {
  const userId = req.user.id;

  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    const bankId = banks[0].id;

    // Mark all expired units as Expired
    const [result] = await db.query(
      `UPDATE blood_inventory 
       SET status = 'Expired' 
       WHERE blood_bank_id = ? AND expiry_date < CURDATE() AND status = 'Available'`,
      [bankId]
    );

    await logAudit(userId, 'Cleared Expired Blood Units', req, `Updated status to Expired for ${result.affectedRows} units`);

    return res.status(200).json({
      success: true,
      message: `Checked and marked ${result.affectedRows} expired blood units.`
    });
  } catch (error) {
    console.error('Clean expired inventory error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
