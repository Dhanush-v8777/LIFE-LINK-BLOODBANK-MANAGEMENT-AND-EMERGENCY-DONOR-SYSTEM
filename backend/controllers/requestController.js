const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');
const { sendEmail } = require('../config/mail');
const { 
  getEmergencyRequestEmail, 
  getRequestApprovalEmail, 
  getRequestRejectionEmail, 
  getRequestCompletionEmail 
} = require('../utils/emailTemplates');
const { generateQRDataURL } = require('../utils/qrGenerator');
const socket = require('../utils/socket');

// Medical Blood compatibility helper (Patient Blood Group -> Matched Donor Groups)
function getCompatibleDonorGroups(patientGroup) {
  const map = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };
  return map[patientGroup] || [patientGroup];
}

exports.createRequest = async (req, res) => {
  const requesterId = req.user.id;
  const { 
    bloodGroup, component, volumeMl, urgency, 
    details, patientName, hospitalName, deliveryAddress, requiredDate 
  } = req.body;

  if (!bloodGroup || !component || !volumeMl || !patientName || !deliveryAddress || !requiredDate) {
    return res.status(400).json({ success: false, message: 'Required request fields are missing' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert Request
    const [result] = await connection.execute(
      `INSERT INTO blood_requests 
       (requester_id, blood_group, component, volume_ml, urgency, status, details, patient_name, hospital_name, delivery_address, required_date) 
       VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?)`,
      [
        requesterId, bloodGroup, component, volumeMl, urgency || 'Normal', 
        details || '', patientName, hospitalName || '', deliveryAddress, requiredDate
      ]
    );
    const requestId = result.insertId;

    // 2. Query available local inventory matching the exact group & component
    const [inventory] = await connection.execute(
      `SELECT id, volume_ml, units 
       FROM blood_inventory 
       WHERE blood_group = ? AND component = ? AND status = 'Available' AND expiry_date >= CURDATE()
       ORDER BY expiry_date ASC`,
      [bloodGroup, component]
    );

    let stockVolume = 0;
    inventory.forEach(item => {
      stockVolume += (item.volume_ml * item.units);
    });

    let autoMatched = false;
    let matchedUnitIds = [];

    // If stock covers the request, allocate it!
    if (stockVolume >= volumeMl) {
      autoMatched = true;
      let remainingToAllocate = volumeMl;
      
      for (const item of inventory) {
        if (remainingToAllocate <= 0) break;
        
        const totalItemVolume = item.volume_ml * item.units;
        if (totalItemVolume <= remainingToAllocate) {
          matchedUnitIds.push(item.id);
          remainingToAllocate -= totalItemVolume;
        } else {
          matchedUnitIds.push(item.id);
          remainingToAllocate = 0;
        }
      }
    }

    await connection.commit();
    connection.release();

    // Audit logs
    await logAudit(requesterId, 'Created Blood Request', req, `Request ID: ${requestId}, ${volumeMl}ml ${bloodGroup} ${component}`);

    // Trigger realtime alerts via Socket.io
    socket.broadcast('new_blood_request', {
      requestId,
      bloodGroup,
      component,
      urgency,
      patientName,
      requiredDate
    });

    // 3. If Stock Not Available & Urgency is Emergency: search eligible donors
    if (!autoMatched && urgency === 'Emergency') {
      const compatibleGroups = getCompatibleDonorGroups(bloodGroup);
      
      // Search active available donors who registered and haven't donated in last 3 months
      const groupPlaceholders = compatibleGroups.map(() => '?').join(',');
      const [eligibleDonors] = await db.query(
        `SELECT d.id, d.blood_group, u.email, u.name, u.id as user_id 
         FROM donors d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.blood_group IN (${groupPlaceholders}) 
           AND d.availability_status = 'Available'
           AND (d.last_donation_date IS NULL OR d.last_donation_date <= DATE_SUB(CURDATE(), INTERVAL 90 DAY))`,
        compatibleGroups
      );

      // Send emergency notifications
      for (const donor of eligibleDonors) {
        try {
          const emailHtml = getEmergencyRequestEmail(
            donor.name, bloodGroup, component, volumeMl, patientName, deliveryAddress
          );
          
          await sendEmail({
            to: donor.email,
            subject: `URGENT: Emergency Blood Request for ${bloodGroup}`,
            html: emailHtml
          });

          // Log database notification
          await db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [donor.user_id, `Emergency matching request found for blood group ${bloodGroup}`, 'Email']
          );
        } catch (mailErr) {
          console.error(`Failed to alert donor ${donor.name} via email:`, mailErr);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Emergency request registered. No matching stock was found, but eligible local donors have been alerted.',
        requestId,
        autoMatched: false
      });
    }

    return res.status(201).json({
      success: true,
      message: autoMatched 
        ? 'Request registered. Sufficient blood stock is available for fulfillment.' 
        : 'Request registered successfully. Awaiting inventory replenishment or staff manual matching.',
      requestId,
      autoMatched,
      matchedUnitIds
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Create request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create blood request' });
  }
};

exports.getRequestsList = async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT r.*, u.name as requester_name, r.requester_id
       FROM blood_requests r 
       JOIN users u ON r.requester_id = u.id 
       ORDER BY r.created_at DESC`
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Fetch requests list error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRequestDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const [requests] = await db.query(
      `SELECT r.*, u.name as requester_name 
       FROM blood_requests r 
       JOIN users u ON r.requester_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = requests[0];
    const [distributions] = await db.query(
      `SELECT bd.*, bi.blood_group, bi.component, bi.volume_ml, bb.name as blood_bank_name 
       FROM blood_distributions bd
       JOIN blood_inventory bi ON bd.blood_inventory_id = bi.id
       JOIN blood_banks bb ON bi.blood_bank_id = bb.id
       WHERE bd.request_id = ?`,
      [id]
    );

    // Generate tracking QR code
    const trackingQr = await generateQRDataURL(`LIFELINK-REQUEST-TRACK-${request.id}-${request.status}`);

    return res.status(200).json({
      success: true,
      request,
      distributions,
      trackingQr
    });
  } catch (error) {
    console.error('Request details retrieval error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateRequestStatus = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { status, reason, allocatedUnitIds } = req.body; // status: 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch request details
    const [requests] = await connection.execute(
      `SELECT r.*, u.email as requester_email, u.name as requester_name 
       FROM blood_requests r 
       JOIN users u ON r.requester_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    if (requests.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const request = requests[0];

    // 2. Perform distribution logic if status changes to Fulfilled
    if (status === 'Fulfilled') {
      let unitsToAllocateIds = [];
      if (allocatedUnitIds && allocatedUnitIds.length > 0) {
        unitsToAllocateIds = allocatedUnitIds;
      } else {
        // Find available matching units automatically
        const [availableUnits] = await connection.execute(
          `SELECT id, volume_ml, units 
           FROM blood_inventory 
           WHERE blood_group = ? AND component = ? AND status = 'Available' AND expiry_date >= CURDATE()
           ORDER BY expiry_date ASC`,
          [request.blood_group, request.component]
        );
        
        let remainingVolume = request.volume_ml;
        for (const item of availableUnits) {
          if (remainingVolume <= 0) break;
          
          const unitVolume = item.volume_ml;
          if (unitVolume <= 0) continue;
          
          const unitsNeeded = Math.ceil(remainingVolume / unitVolume);
          const unitsToTake = Math.min(unitsNeeded, item.units);
          
          if (unitsToTake > 0) {
            unitsToAllocateIds.push({
              id: item.id,
              takeUnits: unitsToTake,
              currentUnits: item.units,
              unitVolume
            });
            remainingVolume -= (unitsToTake * unitVolume);
          }
        }
      }

      // Now issue/update the selected units!
      if (Array.isArray(unitsToAllocateIds) && unitsToAllocateIds.length > 0) {
        for (const alloc of unitsToAllocateIds) {
          if (typeof alloc === 'number' || typeof alloc === 'string') {
            const unitId = alloc;
            await connection.execute(
              'INSERT INTO blood_distributions (request_id, blood_inventory_id) VALUES (?, ?)',
              [id, unitId]
            );
            await connection.execute(
              'UPDATE blood_inventory SET units = 0, status = "Distributed" WHERE id = ?',
              [unitId]
            );
          } else {
            const remainingUnits = alloc.currentUnits - alloc.takeUnits;
            const newStatus = remainingUnits === 0 ? 'Distributed' : 'Available';
            
            await connection.execute(
              'INSERT INTO blood_distributions (request_id, blood_inventory_id) VALUES (?, ?)',
              [id, alloc.id]
            );
            
            await connection.execute(
              'UPDATE blood_inventory SET units = ?, status = ? WHERE id = ?',
              [remainingUnits, newStatus, alloc.id]
            );
          }
        }
      }
    }

    // 3. Update Request status
    await connection.execute(
      'UPDATE blood_requests SET status = ? WHERE id = ?',
      [status, id]
    );

    await connection.commit();
    connection.release();

    // Audit logs
    await logAudit(userId, `Updated Request Status to ${status}`, req, `Request ID: ${id}`);

    // Socket notify
    socket.sendNotification(request.requester_id, {
      message: `Your blood request for ${request.blood_group} has been updated to ${status}.`,
      type: 'RequestUpdate',
      requestId: id
    });

    // Send emails
    try {
      let emailHtml = '';
      let emailSubject = '';
      
      if (status === 'Approved') {
        emailHtml = getRequestApprovalEmail(request.requester_name, request.blood_group, request.component, request.volume_ml);
        emailSubject = 'LifeLink - Blood Request Approved';
      } else if (status === 'Rejected') {
        emailHtml = getRequestRejectionEmail(request.requester_name, request.blood_group, request.component, reason);
        emailSubject = 'LifeLink - Blood Request Status Update';
      } else if (status === 'Fulfilled') {
        emailHtml = getRequestCompletionEmail(request.requester_name, request.blood_group, request.component, request.volume_ml);
        emailSubject = 'LifeLink - Blood Request Fulfilled & Dispatched';
      }

      if (emailHtml) {
        await sendEmail({
          to: request.requester_email,
          subject: emailSubject,
          html: emailHtml
        });
      }
    } catch (mailErr) {
      console.error('Failed to notify requester via email:', mailErr);
    }

    return res.status(200).json({ success: true, message: `Request status successfully updated to ${status}` });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Update request status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update request status' });
  }
};

exports.donorAcceptEmergencyRequest = async (req, res) => {
  const userId = req.user.id; // Logged-in donor
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ success: false, message: 'Request ID is required' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get donor record
    const [donors] = await connection.execute('SELECT id, name FROM donors JOIN users ON donors.user_id = users.id WHERE user_id = ?', [userId]);
    if (donors.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }
    const donor = donors[0];

    // Get request
    const [requests] = await connection.execute('SELECT * FROM blood_requests WHERE id = ?', [requestId]);
    if (requests.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Emergency request not found' });
    }
    const request = requests[0];

    // Check if donation already scheduled
    const [existing] = await connection.execute(
      'SELECT id FROM donations WHERE donor_id = ? AND status = "Scheduled" AND donation_date = CURDATE()',
      [donor.id]
    );
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'You already have a scheduled donation today.' });
    }

    // Resolve a blood bank ID to handle collection (default to blood bank #1 in seeds)
    const [banks] = await connection.execute('SELECT id FROM blood_banks LIMIT 1');
    const bankId = banks.length > 0 ? banks[0].id : 1;

    // Create Scheduled Donation
    const [donationResult] = await connection.execute(
      `INSERT INTO donations (donor_id, blood_bank_id, donation_date, volume_ml, status) 
       VALUES (?, ?, CURDATE(), ?, 'Scheduled')`,
      [donor.id, bankId, request.volume_ml]
    );
    const donationId = donationResult.insertId;

    // Update Request status to 'Approved' or keep it as matching until collected
    // Let's keep it pending but associate donation
    await connection.commit();
    connection.release();

    // Generate Donation Schedule Ticket QR
    const qrData = `LIFELINK-TICKET-${donationId}-${donor.name}-${request.blood_group}-${request.volume_ml}ml`;
    const qrPath = await generateQRDataURL(qrData);

    await logAudit(userId, 'Accepted Emergency Blood Request', req, `Donation ID: ${donationId} scheduled for Request: ${requestId}`);

    return res.status(200).json({
      success: true,
      message: 'Thank you for accepting the emergency request! A donation has been scheduled for today.',
      donationId,
      qrTicket: qrPath
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Accept emergency request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process request acceptance' });
  }
};
