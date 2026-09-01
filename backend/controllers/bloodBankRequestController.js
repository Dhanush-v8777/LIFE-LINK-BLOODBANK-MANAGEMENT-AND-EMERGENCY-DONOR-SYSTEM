const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');
const { sendEmail } = require('../config/mail');
const socket = require('../utils/socket');

// ── Email template helpers ──────────────────────────────────────────────────

function newRequestEmailToBank(bankName, patientName, bloodGroup, unitsRequired, contactNumber, requiredDate, emergencyNotes) {
  const infoRow = (label, value) =>
    `<p style="margin:6px 0;"><strong>${label}:</strong> ${value}</p>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f7f9fc;color:#333}
    .c{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05)}
    .h{background:#dc2626;color:#fff;padding:30px;text-align:center}
    .h h1{margin:0;font-size:24px}
    .b{padding:30px;line-height:1.6}
    .card{background:#fff5f5;border-left:4px solid #dc2626;padding:15px;margin:20px 0;border-radius:0 6px 6px 0}
    .btn{display:inline-block;padding:12px 24px;background:#dc2626;color:#fff!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}
    .f{background:#f1f5f9;padding:20px;text-align:center;font-size:12px;color:#64748b}
  </style></head><body><div class="c">
    <div class="h"><h1>LifeLink</h1><p style="margin:5px 0 0;font-size:14px;opacity:.9">Blood Bank Management System</p></div>
    <div class="b">
      <h2>New Blood Request Received</h2>
      <p>Dear <strong>${bankName}</strong>,</p>
      <p>A patient has submitted a blood request through the LifeLink platform. Please review the details below and respond promptly.</p>
      <div class="card">
        ${infoRow('Patient Name', patientName)}
        ${infoRow('Blood Group Required', `<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600">${bloodGroup}</span>`)}
        ${infoRow('Units Required', unitsRequired + ' unit(s)')}
        ${infoRow('Contact Number', contactNumber)}
        ${infoRow('Required By', new Date(requiredDate).toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'}))}
        ${emergencyNotes ? infoRow('Emergency Notes', emergencyNotes) : ''}
      </div>
      <p>Please log in to your Blood Bank Dashboard to <strong>Accept</strong> or <strong>Reject</strong> this request.</p>
      <div style="text-align:center">
        <a href="http://localhost:5173/staff/blood-requests" class="btn">Review Request in Dashboard</a>
      </div>
      <p style="color:#64748b;font-size:13px;">This request will remain <strong>Pending</strong> until you take action.</p>
    </div>
    <div class="f"><p>Automated message from LifeLink. Do not reply directly.</p><p>&copy; 2026 LifeLink Systems.</p></div>
  </div></body></html>`;
}

function statusUpdateEmailToPatient(patientName, bloodGroup, unitsRequired, status, rejectionReason) {
  const statusColors = {
    Accepted: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#dcfce7', badgeText: '#15803d' },
    Rejected: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#fee2e2', badgeText: '#dc2626' },
    Completed: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', badge: '#dbeafe', badgeText: '#1d4ed8' },
  };
  const c = statusColors[status] || statusColors.Accepted;
  const messages = {
    Accepted: 'Great news! The blood bank has <strong>accepted</strong> your request. They will process the required blood units and contact you.',
    Rejected: `We regret to inform you that your blood request has been <strong>rejected</strong>. ${rejectionReason ? `<br><strong>Reason:</strong> ${rejectionReason}` : 'Please contact the blood bank for more information.'}`,
    Completed: 'Your blood request has been marked as <strong>Completed</strong>. The blood units have been prepared. Please collect them as arranged.',
  };
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f7f9fc;color:#333}
    .c{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05)}
    .h{background:#dc2626;color:#fff;padding:30px;text-align:center}
    .h h1{margin:0;font-size:24px}
    .b{padding:30px;line-height:1.6}
    .btn{display:inline-block;padding:12px 24px;background:#dc2626;color:#fff!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}
    .f{background:#f1f5f9;padding:20px;text-align:center;font-size:12px;color:#64748b}
  </style></head><body><div class="c">
    <div class="h"><h1>LifeLink</h1><p style="margin:5px 0 0;font-size:14px;opacity:.9">Blood Request Status Update</p></div>
    <div class="b">
      <h2>Blood Request ${status}</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>${messages[status] || 'Your blood request status has been updated.'}</p>
      <div style="background:${c.bg};border:1px solid ${c.border};padding:15px;border-radius:6px;margin:20px 0">
        <p style="margin:5px 0"><strong>Blood Group:</strong> <span style="background:${c.badge};color:${c.badgeText};padding:2px 8px;border-radius:4px;font-weight:600">${bloodGroup}</span></p>
        <p style="margin:5px 0"><strong>Units Requested:</strong> ${unitsRequired} unit(s)</p>
        <p style="margin:5px 0"><strong>Status:</strong> <span style="color:${c.text};font-weight:700">${status}</span></p>
      </div>
      <div style="text-align:center">
        <a href="http://localhost:5173/patient/dashboard" class="btn">View My Requests</a>
      </div>
    </div>
    <div class="f"><p>Automated message from LifeLink. Do not reply directly.</p><p>&copy; 2026 LifeLink Systems.</p></div>
  </div></body></html>`;
}

// ── Controller functions ────────────────────────────────────────────────────

/**
 * Patient submits a blood request to a specific blood bank
 * POST /api/bbr/
 */
exports.createBloodBankRequest = async (req, res) => {
  const patientUserId = req.user.id;
  const {
    bloodBankId, patientName, bloodGroup,
    unitsRequired, hospitalName, contactNumber,
    requiredDate, emergencyNotes
  } = req.body;

  // Validation
  if (!bloodBankId || !patientName || !bloodGroup || !unitsRequired || !contactNumber || !requiredDate) {
    return res.status(400).json({ success: false, message: 'All required fields must be provided' });
  }
  if (parseInt(unitsRequired) <= 0) {
    return res.status(400).json({ success: false, message: 'Units required must be a positive number' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify blood bank exists
    const [banks] = await connection.execute(
      'SELECT bb.*, u.email as staff_email FROM blood_banks bb JOIN users u ON bb.user_id = u.id WHERE bb.id = ?',
      [bloodBankId]
    );
    if (banks.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Blood bank not found' });
    }
    const bank = banks[0];

    // 2. Insert request
    const [result] = await connection.execute(
      `INSERT INTO blood_bank_requests
       (patient_user_id, blood_bank_id, patient_name, blood_group, units_required, hospital_name, contact_number, required_date, emergency_notes, status, email_sent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', FALSE)`,
      [patientUserId, bloodBankId, patientName, bloodGroup, unitsRequired, hospitalName || null, contactNumber, requiredDate, emergencyNotes || null]
    );
    const requestId = result.insertId;

    // 3. Notification in DB for blood bank staff
    await connection.execute(
      `INSERT INTO notifications (user_id, message, type, request_id, request_type, status) VALUES (?, ?, 'System', ?, 'blood_bank_request', 'Sent')`,
      [bank.user_id, `New blood request from ${patientName} for ${unitsRequired} unit(s) of ${bloodGroup}. Request ID: #${requestId}`, requestId]
    );

    await connection.commit();
    connection.release();

    // 4. Send email to blood bank (outside transaction)
    let emailSent = false;
    try {
      const emailHtml = newRequestEmailToBank(
        bank.name, patientName, bloodGroup, unitsRequired, contactNumber, requiredDate, emergencyNotes
      );
      await sendEmail({
        to: bank.staff_email,
        subject: 'New Blood Request - LifeLink',
        html: emailHtml
      });
      emailSent = true;
      await db.query('UPDATE blood_bank_requests SET email_sent = TRUE WHERE id = ?', [requestId]);
    } catch (mailErr) {
      console.error('Failed to send blood bank request email:', mailErr);
    }

    // 5. Socket notification
    try {
      socket.sendNotification(bank.user_id, {
        message: `New blood request from ${patientName} for ${unitsRequired} unit(s) of ${bloodGroup}`,
        type: 'BloodBankRequest',
        requestId,
        requestType: 'blood_bank_request'
      });
    } catch (sockErr) {
      console.error('Socket notification error:', sockErr);
    }

    await logAudit(patientUserId, 'Created Blood Bank Request', req, `Request #${requestId} to ${bank.name} for ${unitsRequired}u ${bloodGroup}`);

    return res.status(201).json({
      success: true,
      message: `Blood request submitted to ${bank.name}. ${emailSent ? 'Email notification sent.' : 'Email notification failed.'}`,
      requestId,
      emailSent
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Create blood bank request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit blood request' });
  }
};

/**
 * Patient: Get all their blood bank requests
 * GET /api/bbr/mine
 */
exports.getMyBloodBankRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [requests] = await db.query(
      `SELECT bbr.*, bb.name as blood_bank_name, bb.address as blood_bank_address, bb.phone as blood_bank_phone
       FROM blood_bank_requests bbr
       JOIN blood_banks bb ON bbr.blood_bank_id = bb.id
       WHERE bbr.patient_user_id = ?
       ORDER BY bbr.created_at DESC`,
      [userId]
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get my blood bank requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Blood Bank Staff: Get all incoming requests for their bank
 * GET /api/bbr/incoming
 */
exports.getIncomingRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    if (banks.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood bank not found' });
    }
    const bankId = banks[0].id;

    const { status, bloodGroup, search } = req.query;

    let query = `
      SELECT bbr.*, u.name as patient_display_name, u.email as patient_email
      FROM blood_bank_requests bbr
      JOIN users u ON bbr.patient_user_id = u.id
      WHERE bbr.blood_bank_id = ?
    `;
    const params = [bankId];

    if (status && status !== 'All') {
      query += ' AND bbr.status = ?';
      params.push(status);
    }
    if (bloodGroup && bloodGroup !== 'All') {
      query += ' AND bbr.blood_group = ?';
      params.push(bloodGroup);
    }
    if (search) {
      query += ' AND (bbr.patient_name LIKE ? OR bbr.blood_group LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY bbr.created_at DESC';

    const [requests] = await db.query(query, params);
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get incoming requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Blood Bank Staff: Get single request details
 * GET /api/bbr/:id
 */
exports.getRequestDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const [banks] = await db.query('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    if (banks.length === 0) return res.status(404).json({ success: false, message: 'Blood bank not found' });
    const bankId = banks[0].id;

    const [requests] = await db.query(
      `SELECT bbr.*, u.name as patient_display_name, u.email as patient_email
       FROM blood_bank_requests bbr
       JOIN users u ON bbr.patient_user_id = u.id
       WHERE bbr.id = ? AND bbr.blood_bank_id = ?`,
      [id, bankId]
    );
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    return res.status(200).json({ success: true, request: requests[0] });
  } catch (error) {
    console.error('Get request details error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Blood Bank Staff: Update request status (Accept/Reject/Complete)
 * PUT /api/bbr/:id/status
 */
exports.updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const userId = req.user.id;

  const validStatuses = ['Accepted', 'Rejected', 'Completed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status (Accepted/Rejected/Completed) is required' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify ownership
    const [banks] = await connection.execute('SELECT id FROM blood_banks WHERE user_id = ?', [userId]);
    if (banks.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Blood bank not found' });
    }
    const bankId = banks[0].id;

    // Fetch request
    const [requests] = await connection.execute(
      `SELECT bbr.*, u.email as patient_email, u.name as patient_display_name
       FROM blood_bank_requests bbr
       JOIN users u ON bbr.patient_user_id = u.id
       WHERE bbr.id = ? AND bbr.blood_bank_id = ?`,
      [id, bankId]
    );
    if (requests.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const request = requests[0];

    // Update status
    await connection.execute(
      'UPDATE blood_bank_requests SET status = ?, rejection_reason = ? WHERE id = ?',
      [status, rejectionReason || null, id]
    );

    // In-app notification for patient
    await connection.execute(
      `INSERT INTO notifications (user_id, message, type, request_id, request_type, status) VALUES (?, ?, 'System', ?, 'blood_bank_request', 'Sent')`,
      [request.patient_user_id, `Your blood request for ${request.units_required} unit(s) of ${request.blood_group} has been ${status} by the blood bank.`, id]
    );

    await connection.commit();
    connection.release();

    // Audit log
    await logAudit(userId, `Blood Bank Request ${status}`, req, `Request #${id} for ${request.patient_name}, ${request.blood_group}`);

    // Socket notify patient
    try {
      socket.sendNotification(request.patient_user_id, {
        message: `Your blood request for ${request.blood_group} has been ${status}`,
        type: 'BloodBankRequestUpdate',
        requestId: id,
        requestType: 'blood_bank_request'
      });
    } catch (sockErr) {
      console.error('Socket error:', sockErr);
    }

    // Email patient
    try {
      const emailHtml = statusUpdateEmailToPatient(
        request.patient_display_name, request.blood_group,
        request.units_required, status, rejectionReason
      );
      await sendEmail({
        to: request.patient_email,
        subject: `LifeLink - Blood Request ${status}`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error('Failed to email patient:', mailErr);
    }

    return res.status(200).json({ success: true, message: `Request has been ${status} successfully` });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Update blood bank request status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update request status' });
  }
};
