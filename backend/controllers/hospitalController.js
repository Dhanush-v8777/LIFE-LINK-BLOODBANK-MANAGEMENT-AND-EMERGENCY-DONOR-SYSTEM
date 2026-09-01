const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');
const socket = require('../utils/socket');

exports.getHospitalDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Get hospital profile
    let [hospitals] = await db.query('SELECT * FROM hospitals WHERE user_id = ?', [userId]);
    let hospital = hospitals[0];
    if (!hospital) {
      const [allHospitals] = await db.query('SELECT * FROM hospitals LIMIT 1');
      hospital = allHospitals[0] || { id: 1, name: 'LifeLink Hospital Network', license_number: 'HOSP-1001', contact_person: 'Medical Desk' };
    }

    // 2. Get request stats (from blood_requests placed by hospital)
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingRequests,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approvedRequests,
        SUM(CASE WHEN status = 'Fulfilled' THEN 1 ELSE 0 END) as fulfilledRequests,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejectedRequests
       FROM blood_requests WHERE requester_id = ?`,
      [userId]
    );

    // 3. Get recent blood requests placed by hospital
    const [requests] = await db.query(
      `SELECT r.*, 
       (SELECT COUNT(*) FROM blood_distributions d WHERE d.request_id = r.id) as distributed_units_count
       FROM blood_requests r 
       WHERE r.requester_id = ? 
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // 4. Get incoming patient requests targeting this hospital
    const [incomingPatientRequests] = await db.query(
      `SELECT hr.*, u.name as patient_user_name, u.email as patient_email
       FROM hospital_blood_requests hr
       JOIN users u ON hr.patient_user_id = u.id
       WHERE hr.hospital_id = ?
       ORDER BY hr.created_at DESC`,
      [hospital.id]
    );

    // 5. View overall available regional stock for convenience
    const [regionalStock] = await db.query(
      `SELECT bi.blood_group, bi.component, SUM(bi.volume_ml) as total_volume, bb.name as blood_bank_name
       FROM blood_inventory bi
       JOIN blood_banks bb ON bi.blood_bank_id = bb.id
       WHERE bi.status = 'Available' AND bi.expiry_date >= CURDATE()
       GROUP BY bb.name, bi.blood_group, bi.component`
    );

    return res.status(200).json({
      success: true,
      hospital,
      stats: stats[0] || { totalRequests: 0, pendingRequests: 0, approvedRequests: 0, fulfilledRequests: 0, rejectedRequests: 0 },
      requests,
      incomingPatientRequests,
      regionalStock
    });
  } catch (error) {
    console.error('Hospital dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve hospital dashboard details' });
  }
};

exports.getHospitalRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [requests] = await db.query(
      'SELECT * FROM blood_requests WHERE requester_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get hospital requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Patient creates blood request for a specific hospital
 * POST /api/hospitals/request
 */
exports.createHospitalRequest = async (req, res) => {
  const patientUserId = req.user.id;
  const { hospitalId, patientName, bloodGroup, unitsRequired, contactNumber, requiredDate, emergencyNotes } = req.body;

  if (!hospitalId || !patientName || !bloodGroup || !unitsRequired || !contactNumber || !requiredDate) {
    return res.status(400).json({ success: false, message: 'Missing required request fields' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify hospital exists
    const [hospitals] = await connection.execute(
      'SELECT h.*, u.id as hospital_user_id, u.email as hospital_email FROM hospitals h JOIN users u ON h.user_id = u.id WHERE h.id = ?',
      [hospitalId]
    );

    if (hospitals.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    const hospital = hospitals[0];

    // Insert request
    const [result] = await connection.execute(
      `INSERT INTO hospital_blood_requests 
       (patient_user_id, hospital_id, patient_name, blood_group, units_required, contact_number, required_date, emergency_notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [patientUserId, hospitalId, patientName, bloodGroup, parseInt(unitsRequired), contactNumber, requiredDate, emergencyNotes || '']
    );
    const requestId = result.insertId;

    // Create Notification in DB for hospital
    const notifMsg = `New blood request from patient ${patientName} for ${unitsRequired} unit(s) of ${bloodGroup}.`;
    await connection.execute(
      `INSERT INTO notifications (user_id, message, type, request_id, request_type, status) VALUES (?, ?, 'System', ?, 'hospital_request', 'Sent')`,
      [hospital.hospital_user_id, notifMsg, requestId]
    );

    await connection.commit();
    connection.release();

    // Socket notification to hospital
    try {
      socket.sendNotification(hospital.hospital_user_id, {
        message: notifMsg,
        type: 'HospitalRequest',
        requestId,
        requestType: 'hospital_request'
      });
    } catch (sockErr) {
      console.error('Socket notification error:', sockErr);
    }

    await logAudit(patientUserId, 'Sent Hospital Blood Request', req, `Request ID: ${requestId}, Hospital: ${hospital.name}`);

    return res.status(201).json({
      success: true,
      message: `Blood request sent to ${hospital.name} successfully.`,
      requestId
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Create hospital request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create hospital blood request' });
  }
};

/**
 * Patient gets their own requests sent to hospitals
 * GET /api/hospitals/my-requests
 */
exports.getMyHospitalRequests = async (req, res) => {
  const patientUserId = req.user.id;
  try {
    const [requests] = await db.query(
      `SELECT hr.*, h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone
       FROM hospital_blood_requests hr
       JOIN hospitals h ON hr.hospital_id = h.id
       WHERE hr.patient_user_id = ?
       ORDER BY hr.created_at DESC`,
      [patientUserId]
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get my hospital requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Hospital views incoming patient requests
 * GET /api/hospitals/incoming-requests
 */
exports.getIncomingHospitalRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [hospitals] = await db.query('SELECT id FROM hospitals WHERE user_id = ?', [userId]);
    const hospitalId = hospitals[0]?.id;

    let requests = [];
    if (hospitalId) {
      [requests] = await db.query(
        `SELECT hr.*, u.name as patient_user_name, u.email as patient_email
         FROM hospital_blood_requests hr
         JOIN users u ON hr.patient_user_id = u.id
         WHERE hr.hospital_id = ?
         ORDER BY hr.created_at DESC`,
        [hospitalId]
      );
    } else {
      [requests] = await db.query(
        `SELECT hr.*, u.name as patient_user_name, u.email as patient_email, h.name as hospital_name
         FROM hospital_blood_requests hr
         JOIN users u ON hr.patient_user_id = u.id
         JOIN hospitals h ON hr.hospital_id = h.id
         ORDER BY hr.created_at DESC`
      );
    }

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get incoming hospital requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Hospital staff updates request status (Approve / Reject / Fulfilled)
 * PUT /api/hospitals/requests/:id/status
 */
exports.updateHospitalRequestStatus = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { status, rejectionReason } = req.body; // 'Approved', 'Rejected', 'Fulfilled'

  if (!status || !['Approved', 'Accepted', 'Rejected', 'Fulfilled', 'Completed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  const normalizedStatus = (status === 'Accepted' || status === 'Approved') ? 'Approved' : (status === 'Completed' || status === 'Fulfilled') ? 'Fulfilled' : 'Rejected';

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [hospitals] = await connection.execute('SELECT id, name FROM hospitals WHERE user_id = ?', [userId]);
    if (hospitals.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }
    const hospital = hospitals[0];

    const [requests] = await connection.execute(
      'SELECT * FROM hospital_blood_requests WHERE id = ? AND hospital_id = ?',
      [id, hospital.id]
    );

    if (requests.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const request = requests[0];

    await connection.execute(
      'UPDATE hospital_blood_requests SET status = ?, rejection_reason = ? WHERE id = ?',
      [normalizedStatus, rejectionReason || null, id]
    );

    const notifMsg = normalizedStatus === 'Approved'
      ? `Your blood request to ${hospital.name} for ${request.blood_group} has been APPROVED.`
      : normalizedStatus === 'Fulfilled'
      ? `Your blood request to ${hospital.name} for ${request.blood_group} has been FULFILLED.`
      : `Your blood request to ${hospital.name} for ${request.blood_group} was REJECTED.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

    await connection.execute(
      `INSERT INTO notifications (user_id, message, type, request_id, request_type, status) VALUES (?, ?, 'System', ?, 'hospital_request', 'Sent')`,
      [request.patient_user_id, notifMsg, id]
    );

    await connection.commit();
    connection.release();

    try {
      socket.sendNotification(request.patient_user_id, {
        message: notifMsg,
        type: `HospitalRequest${normalizedStatus}`,
        requestId: id,
        requestType: 'hospital_request'
      });
    } catch (sockErr) {
      console.error('Socket notification error:', sockErr);
    }

    await logAudit(userId, `Updated Hospital Request #${id} to ${normalizedStatus}`, req);

    return res.status(200).json({
      success: true,
      message: `Request status updated to ${normalizedStatus}`
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Update hospital request status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update request status' });
  }
};
