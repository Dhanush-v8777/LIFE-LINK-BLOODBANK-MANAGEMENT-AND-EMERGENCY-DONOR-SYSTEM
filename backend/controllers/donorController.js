const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');
const { sendEmail } = require('../config/mail');
const { getDonorEligibleAgainEmail } = require('../utils/emailTemplates');
const socket = require('../utils/socket');
const PDFDocument = require('pdfkit');

// Helper: check & auto-reactivate donor if 56-day period has passed
async function checkAndReactivateDonor(donorId, donorUserId, donorName, donorEmail) {
  try {
    const [rows] = await db.query(
      'SELECT next_eligible_date, availability_status FROM donors WHERE id = ?',
      [donorId]
    );
    if (rows.length === 0) return;

    const { next_eligible_date, availability_status } = rows[0];

    if (next_eligible_date && new Date(next_eligible_date) <= new Date() && availability_status === 'Unavailable') {
      // Reactivate the donor
      await db.query(
        "UPDATE donors SET availability_status = 'Available', next_eligible_date = NULL WHERE id = ?",
        [donorId]
      );

      // Notify via in-app notification
      await db.query(
        "INSERT INTO notifications (user_id, message, type, status) VALUES (?, ?, 'System', 'Sent')",
        [donorUserId, 'Your 56-day donation cooldown has ended. You are now eligible to donate blood again!']
      );

      // Send reactivation email
      try {
        const emailHtml = getDonorEligibleAgainEmail(donorName);
        await sendEmail({
          to: donorEmail,
          subject: 'You Are Eligible to Donate Again - LifeLink',
          html: emailHtml
        });
      } catch (mailErr) {
        console.error('Failed to send reactivation email:', mailErr);
      }
    }
  } catch (err) {
    console.error('Auto-reactivation check error:', err);
  }
}

exports.getDonorDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Get Donor Profile
    const [donors] = await db.query(
      'SELECT d.*, u.name, u.email FROM donors d JOIN users u ON d.user_id = u.id WHERE d.user_id = ?',
      [userId]
    );
    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }
    const donor = donors[0];

    // 2. Auto-reactivate if 56-day cooldown has passed
    await checkAndReactivateDonor(donor.id, userId, donor.name, donor.email);

    // 3. Re-fetch donor (may have been reactivated)
    const [refreshed] = await db.query(
      'SELECT d.*, u.name, u.email FROM donors d JOIN users u ON d.user_id = u.id WHERE d.user_id = ?',
      [userId]
    );
    const freshDonor = refreshed[0];

    // 4. Get Donation History
    const [donations] = await db.query(
      `SELECT d.*, b.name as blood_bank_name 
       FROM donations d 
       JOIN blood_banks b ON d.blood_bank_id = b.id 
       WHERE d.donor_id = ? 
       ORDER BY d.donation_date DESC`,
      [freshDonor.id]
    );

    // 5. 56-Day Eligibility Status
    let eligibility = { isEligible: true, reason: 'You are eligible to donate blood' };
    if (freshDonor.next_eligible_date && new Date(freshDonor.next_eligible_date) > new Date()) {
      const nextDate = new Date(freshDonor.next_eligible_date);
      const daysLeft = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
      eligibility = {
        isEligible: false,
        nextEligibleDate: nextDate.toISOString().split('T')[0],
        daysLeft,
        reason: `Not Eligible Until ${nextDate.toLocaleDateString()} (${daysLeft} days remaining)`
      };
    } else if (freshDonor.last_donation_date) {
      // Legacy fallback: 56-day check from last_donation_date if next_eligible_date not set
      const lastDate = new Date(freshDonor.last_donation_date);
      const nextEligible = new Date(lastDate.getTime() + 56 * 24 * 60 * 60 * 1000);
      if (new Date() < nextEligible) {
        const daysLeft = Math.ceil((nextEligible - new Date()) / (1000 * 60 * 60 * 24));
        eligibility = {
          isEligible: false,
          nextEligibleDate: nextEligible.toISOString().split('T')[0],
          daysLeft,
          reason: `Not Eligible Until ${nextEligible.toLocaleDateString()} (${daysLeft} days remaining — 56-day rule)`
        };
      }
    }

    // 6. Pending emergency requests matching donor's blood group
    const [requests] = await db.query(
      `SELECT r.*, u.name as requester_name 
       FROM blood_requests r 
       JOIN users u ON r.requester_id = u.id 
       WHERE r.blood_group = ? AND r.urgency = 'Emergency' AND r.status = 'Pending'
       ORDER BY r.created_at DESC`,
      [freshDonor.blood_group]
    );

    // 7. Incoming direct patient requests (pending/accepted)
    const [incomingRequests] = await db.query(
      `SELECT dbr.*, u.name as patient_name
       FROM donor_blood_requests dbr
       JOIN users u ON dbr.patient_id = u.id
       WHERE dbr.donor_id = ?
       ORDER BY dbr.created_at DESC
       LIMIT 5`,
      [freshDonor.id]
    );

    return res.status(200).json({
      success: true,
      donor: freshDonor,
      donations,
      eligibility,
      matchingEmergencyRequests: requests,
      incomingRequests
    });
  } catch (error) {
    console.error('Donor dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve donor dashboard details' });
  }
};

exports.updateAvailability = async (req, res) => {
  const userId = req.user.id;
  const { status } = req.body; // 'Available', 'Unavailable'

  if (!status || !['Available', 'Unavailable'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid availability status value' });
  }

  try {
    // Don't allow manually setting to Available if still in 56-day cooldown
    if (status === 'Available') {
      const [donors] = await db.query('SELECT next_eligible_date FROM donors WHERE user_id = ?', [userId]);
      if (donors.length > 0 && donors[0].next_eligible_date && new Date(donors[0].next_eligible_date) > new Date()) {
        return res.status(400).json({
          success: false,
          message: `You cannot set yourself as Available until your 56-day cooldown ends on ${new Date(donors[0].next_eligible_date).toLocaleDateString()}`
        });
      }
    }

    await db.query('UPDATE donors SET availability_status = ? WHERE user_id = ?', [status, userId]);
    await logAudit(userId, 'Updated Availability Status', req, `Availability updated to ${status}`);
    return res.status(200).json({ success: true, message: 'Availability status updated successfully' });
  } catch (error) {
    console.error('Update availability error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
};

exports.getDonationHistory = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const statusFilter = req.query.status || 'All';
  const offset = (page - 1) * limit;

  try {
    const [donors] = await db.query('SELECT id FROM donors WHERE user_id = ?', [userId]);
    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    const donorId = donors[0].id;

    let baseQuery = `
      SELECT 
        d.id as source_id,
        'Blood Bank' as source_type,
        d.donation_date as donation_date,
        b.name as recipient_name,
        donors.blood_group as blood_group,
        d.volume_ml as volume_ml,
        ROUND(d.volume_ml / 450, 1) as units_donated,
        d.status as status,
        NULL as certificate_id
      FROM donations d
      JOIN blood_banks b ON d.blood_bank_id = b.id
      JOIN donors ON d.donor_id = donors.id
      WHERE d.donor_id = ?

      UNION ALL

      SELECT 
        req.id as source_id,
        'Patient' as source_type,
        COALESCE(req.donation_date, DATE(req.created_at)) as donation_date,
        req.patient_name as recipient_name,
        req.blood_group as blood_group,
        450 as volume_ml,
        1 as units_donated,
        req.request_status as status,
        cert.id as certificate_id
      FROM donor_blood_requests req
      LEFT JOIN donation_certificates cert ON cert.request_id = req.id
      WHERE req.donor_id = ? AND req.request_status IN ('Completed', 'Accepted', 'Rejected', 'Pending')
    `;

    let finalQuery = `WITH CombinedHistory AS (${baseQuery}) SELECT * FROM CombinedHistory WHERE 1=1`;
    let countQuery = `WITH CombinedHistory AS (${baseQuery}) SELECT COUNT(*) as total FROM CombinedHistory WHERE 1=1`;
    
    const queryParams = [donorId, donorId];
    
    if (search) {
      finalQuery += ` AND recipient_name LIKE ?`;
      countQuery += ` AND recipient_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    if (statusFilter !== 'All') {
      finalQuery += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      queryParams.push(statusFilter);
    }

    finalQuery += ` ORDER BY donation_date DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    const [countResult] = await db.pool.query(countQuery, queryParams);
    const total = countResult[0]?.total || 0;

    const [donations] = await db.pool.query(finalQuery, queryParams);

    return res.status(200).json({ 
      success: true, 
      data: donations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to get donation history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get all incoming blood requests sent to this donor
 */
exports.getBloodRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [donors] = await db.query('SELECT id FROM donors WHERE user_id = ?', [userId]);
    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    const [requests] = await db.query(
      `SELECT dbr.*, u.name as patient_name
       FROM donor_blood_requests dbr
       JOIN users u ON dbr.patient_id = u.id
       WHERE dbr.donor_id = ?
       ORDER BY dbr.created_at DESC`,
      [donors[0].id]
    );

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get blood requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Donor responds to a patient blood request (Accept or Reject)
 */
exports.respondToRequest = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { action } = req.body; // 'Accept' or 'Reject'

  if (!action || !['Accept', 'Reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be Accept or Reject' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get donor
    const [donors] = await connection.execute(
      'SELECT id FROM donors WHERE user_id = ?',
      [userId]
    );
    if (donors.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    // Get request & verify ownership
    const [requests] = await connection.execute(
      `SELECT dbr.*, u.name as patient_name
       FROM donor_blood_requests dbr
       JOIN users u ON dbr.patient_id = u.id
       WHERE dbr.id = ? AND dbr.donor_id = ?`,
      [id, donors[0].id]
    );
    if (requests.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Request not found or not assigned to you' });
    }

    const request = requests[0];

    if (request.request_status !== 'Pending') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: `This request is already ${request.request_status}` });
    }

    const newStatus = action === 'Accept' ? 'Accepted' : 'Rejected';

    await connection.execute(
      'UPDATE donor_blood_requests SET request_status = ? WHERE id = ?',
      [newStatus, id]
    );

    // Notify patient
    const notifMsg = action === 'Accept'
      ? `Your blood request for ${request.blood_group} has been ACCEPTED by the donor. Please coordinate with them.`
      : `Your blood request for ${request.blood_group} was declined by the donor. Please search for another available donor.`;

    await connection.execute(
      "INSERT INTO notifications (user_id, message, type, request_id, request_type, status) VALUES (?, ?, 'System', ?, 'donor_request', 'Sent')",
      [request.patient_id, notifMsg, id]
    );

    await connection.commit();
    connection.release();

    // Socket notification to patient
    try {
      socket.sendNotification(request.patient_id, {
        message: notifMsg,
        type: action === 'Accept' ? 'RequestAccepted' : 'RequestRejected',
        requestId: id,
        requestType: 'donor_request'
      });
    } catch (sockErr) {
      console.error('Socket notification error:', sockErr);
    }

    await logAudit(userId, `${action}ed Blood Request`, req, `Request ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: `Request ${newStatus.toLowerCase()} successfully`
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Respond to request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process response' });
  }
};

/**
 * Donor marks a donation as completed — enforces 56-day cooldown
 */
exports.completeDonation = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params; // donor_blood_request ID

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get donor
    const [donors] = await connection.execute(
      'SELECT d.id FROM donors d WHERE d.user_id = ?',
      [userId]
    );
    if (donors.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }
    const donorId = donors[0].id;

    // Verify request is Accepted and belongs to this donor
    const [requests] = await connection.execute(
      `SELECT dbr.*, u.name as patient_name
       FROM donor_blood_requests dbr
       JOIN users u ON dbr.patient_id = u.id
       WHERE dbr.id = ? AND dbr.donor_id = ?`,
      [id, donorId]
    );
    if (requests.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Request not found or not assigned to you' });
    }

    const request = requests[0];

    if (request.request_status !== 'Accepted') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Request must be in Accepted status to complete donation' });
    }

    const today = new Date().toISOString().split('T')[0];
    // Calculate next eligible date (today + 56 days)
    const nextEligibleDate = new Date();
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 56);
    const nextEligibleStr = nextEligibleDate.toISOString().split('T')[0];

    // 1. Mark request as Completed with donation date
    await connection.execute(
      'UPDATE donor_blood_requests SET request_status = "Completed", donation_date = ? WHERE id = ?',
      [today, id]
    );

    // 1.2 Record in donations table
    try {
      await connection.execute(
        `INSERT INTO donations (donor_id, donation_date, volume_ml, status) VALUES (?, ?, 450, 'Completed')`,
        [donorId, today]
      );
    } catch (dErr) {
      console.error('Donation record insertion notice:', dErr);
    }

    // 1.5 Create Donation Certificate
    const certId = `LL-CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await connection.execute(
      `INSERT INTO donation_certificates 
       (certificate_id, donor_id, request_id, patient_name, blood_group, donation_date, units_donated) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [certId, donorId, id, request.patient_name, request.blood_group, today, 1]
    );

    // 2. Update donor: set last_donation_date, next_eligible_date, mark Unavailable
    await connection.execute(
      `UPDATE donors 
       SET last_donation_date = ?, next_eligible_date = ?, availability_status = 'Unavailable'
       WHERE id = ?`,
      [today, nextEligibleStr, donorId]
    );

    // 3. Notify patient: donation complete
    await connection.execute(
      "INSERT INTO notifications (user_id, message, type, status) VALUES (?, ?, 'System', 'Sent')",
      [request.patient_id, `The donor has completed your blood donation request for ${request.blood_group}. Thank you!`]
    );

    // 4. Notify donor: cooldown started
    await connection.execute(
      "INSERT INTO notifications (user_id, message, type, status) VALUES (?, ?, 'System', 'Sent')",
      [userId, `Donation recorded successfully. Your next eligible donation date is ${nextEligibleDate.toLocaleDateString()} (56-day cooldown).`]
    );

    await connection.commit();
    connection.release();

    // Socket notifications
    try {
      socket.sendNotification(request.patient_id, {
        message: `Donation completed for your blood request (${request.blood_group})`,
        type: 'DonationCompleted',
        requestId: id
      });
      socket.sendNotification(userId, {
        message: `Donation complete! Next eligible date: ${nextEligibleDate.toLocaleDateString()}`,
        type: 'DonationComplete',
        nextEligibleDate: nextEligibleStr
      });
    } catch (sockErr) {
      console.error('Socket notification error:', sockErr);
    }

    await logAudit(userId, 'Completed Donation', req, `Request ID: ${id}, Next eligible: ${nextEligibleStr}`);

    return res.status(200).json({
      success: true,
      message: 'Donation marked as completed. You are now in a 56-day cooldown period.',
      donationDate: today,
      nextEligibleDate: nextEligibleStr
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Complete donation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete donation' });
  }
};

exports.getCertificates = async (req, res) => {
  const userId = req.user.id;
  try {
    const [donors] = await db.query('SELECT id FROM donors WHERE user_id = ?', [userId]);
    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    const donorId = donors[0].id;

    const [certificates] = await db.query(
      `SELECT * FROM donation_certificates WHERE donor_id = ? ORDER BY created_at DESC`,
      [donorId]
    );

    return res.status(200).json({ success: true, certificates });
  } catch (error) {
    console.error('Failed to get certificates:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.generateCertificatePDF = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // 1. Verify ownership and fetch details
    const [donors] = await db.query('SELECT id, user_id FROM donors WHERE user_id = ?', [userId]);
    if (donors.length === 0) return res.status(404).json({ success: false, message: 'Donor not found' });
    
    const [users] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
    const donorName = users[0].name;

    const [certs] = await db.query(
      'SELECT * FROM donation_certificates WHERE id = ? AND donor_id = ?', 
      [id, donors[0].id]
    );

    if (certs.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    const cert = certs[0];

    // 2. Generate PDF
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename=${cert.certificate_id}.pdf`);
    doc.pipe(res);

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#dc2626');
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke('#dc2626');

    // Header Background
    doc.rect(25, 25, doc.page.width - 50, 100).fill('#dc2626');

    // Title / Logo text
    doc.fillColor('#ffffff')
       .fontSize(36)
       .text('LIFELINK', 0, 45, { align: 'center', bold: true })
       .fontSize(14)
       .text('CERTIFICATE OF DONATION', 0, 90, { align: 'center', tracking: 2 });

    doc.moveDown(4);

    // Body
    doc.fillColor('#333333')
       .fontSize(16)
       .text('This proudly certifies that', { align: 'center' })
       .moveDown(1);
       
    doc.fillColor('#dc2626')
       .fontSize(32)
       .text(donorName.toUpperCase(), { align: 'center', bold: true })
       .moveDown(1);

    doc.fillColor('#333333')
       .fontSize(16)
       .text('has successfully completed a voluntary blood donation', { align: 'center' })
       .moveDown(0.5);

    // Details Grid
    doc.fontSize(14);
    const startY = 320;
    doc.text(`Blood Group: ${cert.blood_group}`, 100, startY);
    doc.text(`Date of Donation: ${new Date(cert.donation_date).toLocaleDateString()}`, 100, startY + 25);
    
    doc.text(`Donated For: ${cert.patient_name || 'LifeLink Blood Bank'}`, 450, startY);
    doc.text(`Units Donated: ${cert.units_donated}`, 450, startY + 25);

    // Certificate ID Footer
    doc.fontSize(10).fillColor('#666666')
       .text(`Certificate ID: ${cert.certificate_id}`, 100, doc.page.height - 80);

    // Authorized Signature
    doc.fontSize(12).fillColor('#333333')
       .text('Authorized Signature', doc.page.width - 250, doc.page.height - 80);
    
    // Stylized Signature
    doc.fontSize(24).fillColor('#dc2626')
       .text('LifeLink Med', doc.page.width - 250, doc.page.height - 110);

    doc.moveTo(doc.page.width - 250, doc.page.height - 85).lineTo(doc.page.width - 100, doc.page.height - 85).stroke();

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};
