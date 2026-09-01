const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');
const { sendEmail } = require('../config/mail');
const { getDonorBloodRequestEmail } = require('../utils/emailTemplates');
const socket = require('../utils/socket');

exports.getPatientDashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Get Patient details
    const [patients] = await db.query('SELECT * FROM patients WHERE user_id = ?', [userId]);
    if (patients.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    const patient = patients[0];

    // 2. Get Patient's Blood Bank Requests
    const [requests] = await db.query(
      `SELECT r.*, 
       (SELECT COUNT(*) FROM blood_distributions d WHERE d.request_id = r.id) as distributed_units_count
       FROM blood_requests r 
       WHERE r.requester_id = ? 
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      patient,
      requests
    });
  } catch (error) {
    console.error('Patient dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patient dashboard details' });
  }
};

exports.getPatientRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [requests] = await db.query(
      'SELECT * FROM blood_requests WHERE requester_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get patient requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Blood compatibility helper: who can donate to patient requesting bloodGroup
function getCompatibleDonorGroups(bloodGroup) {
  const map = {
    'O-': ['O-'],
    'O+': ['O+', 'O-'],
    'A-': ['A-', 'O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
  };
  return map[bloodGroup] || [bloodGroup];
}

// Haversine distance helper (km)
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CITY_COORDS_MAP = {
  'Springfield': { lat: 39.7817, lng: -89.6501 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
};

/**
 * Search for eligible donors, blood banks, and hospitals by blood group and 20 KM proximity.
 */
exports.searchDonors = async (req, res) => {
  const { bloodGroup, latitude, longitude, city } = req.query;

  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!bloodGroup || !validGroups.includes(bloodGroup)) {
    return res.status(400).json({ success: false, message: 'Valid blood group is required (A+, A-, B+, B-, AB+, AB-, O+, O-)' });
  }

  try {
    // 1. Resolve Patient Location Priority:
    // Priority 1: Query lat/lng
    // Priority 2: Patient's saved profile lat/lng
    // Priority 3: City lookup / default Springfield
    let userLat = parseFloat(latitude);
    let userLng = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLng)) {
      if (req.user && req.user.id) {
        const [patRows] = await db.query('SELECT latitude, longitude, city FROM patients WHERE user_id = ?', [req.user.id]);
        if (patRows.length > 0 && patRows[0].latitude && patRows[0].longitude) {
          userLat = parseFloat(patRows[0].latitude);
          userLng = parseFloat(patRows[0].longitude);
        } else if (patRows.length > 0 && patRows[0].city && CITY_COORDS_MAP[patRows[0].city]) {
          userLat = CITY_COORDS_MAP[patRows[0].city].lat;
          userLng = CITY_COORDS_MAP[patRows[0].city].lng;
        }
      }
    }

    if (isNaN(userLat) || isNaN(userLng)) {
      if (city && CITY_COORDS_MAP[city]) {
        userLat = CITY_COORDS_MAP[city].lat;
        userLng = CITY_COORDS_MAP[city].lng;
      } else {
        // Fallback default coordinates for Springfield seed dataset
        userLat = 39.7817;
        userLng = -89.6501;
      }
    }

    const compatibleGroups = getCompatibleDonorGroups(bloodGroup);

    // 2. Fetch Eligible Donors with blood compatibility
    const placeholders = compatibleGroups.map(() => '?').join(',');
    const [allDonors] = await db.query(
      `SELECT d.id as donor_id, d.blood_group, d.availability_status, 
              d.last_donation_date, d.next_eligible_date, d.address, d.phone, d.city,
              d.latitude, d.longitude,
              u.name, u.email
       FROM donors d
       JOIN users u ON d.user_id = u.id
       WHERE d.blood_group IN (${placeholders})
         AND d.availability_status = 'Available'
         AND u.is_verified = 1
         AND (d.next_eligible_date IS NULL OR d.next_eligible_date <= CURDATE())
       ORDER BY u.name ASC`,
      [...compatibleGroups]
    );

    const filteredDonors = allDonors.map(d => {
      let dLat = d.latitude ? parseFloat(d.latitude) : (d.city && CITY_COORDS_MAP[d.city] ? CITY_COORDS_MAP[d.city].lat : null);
      let dLng = d.longitude ? parseFloat(d.longitude) : (d.city && CITY_COORDS_MAP[d.city] ? CITY_COORDS_MAP[d.city].lng : null);
      const dist = calculateHaversineKm(userLat, userLng, dLat, dLng);
      return {
        ...d,
        distance_km: dist !== null ? parseFloat(dist.toFixed(2)) : 0
      };
    })
      .filter(d => d.distance_km <= 20)
      .sort((a, b) => a.distance_km - b.distance_km);

    // 3. Fetch Blood Banks
    const [allBloodBanks] = await db.query(
      `SELECT bb.id, bb.name, bb.address, bb.phone, bb.contact_person, bb.city,
              bb.latitude, bb.longitude,
              COALESCE(SUM(bi.volume_ml), 0) as available_volume_ml
       FROM blood_banks bb
       LEFT JOIN blood_inventory bi ON bi.blood_bank_id = bb.id
         AND bi.blood_group = ?
         AND bi.status = 'Available'
         AND bi.expiry_date >= CURDATE()
       GROUP BY bb.id, bb.name, bb.address, bb.phone, bb.contact_person, bb.city, bb.latitude, bb.longitude`,
      [bloodGroup]
    );

    const filteredBloodBanks = allBloodBanks.map(bb => {
      let bLat = bb.latitude ? parseFloat(bb.latitude) : (bb.city && CITY_COORDS_MAP[bb.city] ? CITY_COORDS_MAP[bb.city].lat : null);
      let bLng = bb.longitude ? parseFloat(bb.longitude) : (bb.city && CITY_COORDS_MAP[bb.city] ? CITY_COORDS_MAP[bb.city].lng : null);
      const dist = calculateHaversineKm(userLat, userLng, bLat, bLng);
      return {
        ...bb,
        distance_km: dist !== null ? parseFloat(dist.toFixed(2)) : 0
      };
    })
      .filter(bb => bb.distance_km <= 20)
      .sort((a, b) => a.distance_km - b.distance_km);

    // 4. Fetch Hospitals
    const [allHospitals] = await db.query(
      `SELECT h.id, h.name, h.address, h.phone, h.contact_person, h.city,
              h.latitude, h.longitude
       FROM hospitals h
       JOIN users u ON h.user_id = u.id
       WHERE u.is_verified = 1`
    );

    const filteredHospitals = allHospitals.map(h => {
      let hLat = h.latitude ? parseFloat(h.latitude) : (h.city && CITY_COORDS_MAP[h.city] ? CITY_COORDS_MAP[h.city].lat : null);
      let hLng = h.longitude ? parseFloat(h.longitude) : (h.city && CITY_COORDS_MAP[h.city] ? CITY_COORDS_MAP[h.city].lng : null);
      const dist = calculateHaversineKm(userLat, userLng, hLat, hLng);
      return {
        ...h,
        distance_km: dist !== null ? parseFloat(dist.toFixed(2)) : 0
      };
    })
      .filter(h => h.distance_km <= 20)
      .sort((a, b) => a.distance_km - b.distance_km);

    return res.status(200).json({
      success: true,
      bloodGroup,
      radiusKm: 20,
      donors: filteredDonors,
      bloodBanks: filteredBloodBanks,
      hospitals: filteredHospitals
    });
  } catch (error) {
    console.error('Search donors error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search donors' });
  }
};

/**
 * Patient sends a direct blood request to a specific donor
 * Creates a DB record, sends email, creates notification
 */
exports.sendDonorRequest = async (req, res) => {
  const patientUserId = req.user.id;
  const { donorId, bloodGroup, patientMessage } = req.body;

  if (!donorId || !bloodGroup) {
    return res.status(400).json({ success: false, message: 'Donor ID and blood group are required' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get patient info
    const [patients] = await connection.execute(
      'SELECT p.*, u.name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?',
      [patientUserId]
    );
    if (patients.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    const patient = patients[0];

    // 2. Get donor info (verify eligibility & check not in cooldown)
    const [donors] = await connection.execute(
      `SELECT d.id, d.blood_group, d.availability_status, d.next_eligible_date,
              u.name as donor_name, u.email as donor_email, u.id as donor_user_id
       FROM donors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [donorId]
    );
    if (donors.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }
    const donor = donors[0];

    // 3. Check donor eligibility
    if (donor.availability_status !== 'Available') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'This donor is currently unavailable' });
    }
    if (donor.next_eligible_date && new Date(donor.next_eligible_date) > new Date()) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: `This donor is in a 56-day cooldown period until ${new Date(donor.next_eligible_date).toLocaleDateString()}`
      });
    }

    // 4. Check for duplicate pending/accepted request
    const [existing] = await connection.execute(
      `SELECT id FROM donor_blood_requests 
       WHERE patient_id = ? AND donor_id = ? AND request_status IN ('Pending', 'Accepted')`,
      [patientUserId, donorId]
    );
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'You already have an active request to this donor' });
    }

    // 5. Create the donor blood request record
    const [result] = await connection.execute(
      `INSERT INTO donor_blood_requests 
       (patient_id, donor_id, blood_group, patient_name, patient_message, request_status, email_sent)
       VALUES (?, ?, ?, ?, ?, 'Pending', FALSE)`,
      [patientUserId, donorId, bloodGroup, patient.name, patientMessage || '']
    );
    const requestId = result.insertId;

    // 6. Create in-app notification for donor
    await connection.execute(
      `INSERT INTO notifications (user_id, message, type, request_id, request_type, status)
       VALUES (?, ?, 'System', ?, 'donor_request', 'Sent')`,
      [donor.donor_user_id, `New blood request from patient ${patient.name} for blood group ${bloodGroup}. Please review and respond.`, requestId]
    );

    await connection.commit();
    connection.release();

    // 7. Send email to donor (outside transaction)
    let emailSent = false;
    try {
      const emailHtml = getDonorBloodRequestEmail(donor.donor_name, bloodGroup, patient.name);
      await sendEmail({
        to: donor.donor_email,
        subject: 'Urgent Blood Request - LifeLink',
        html: emailHtml
      });
      emailSent = true;
      // Update email_sent flag
      await db.query('UPDATE donor_blood_requests SET email_sent = TRUE WHERE id = ?', [requestId]);
    } catch (mailErr) {
      console.error('Failed to send blood request email to donor:', mailErr);
    }

    // 8. Emit socket notification to donor
    try {
      socket.sendNotification(donor.donor_user_id, {
        message: `New blood request from ${patient.name} for ${bloodGroup}`,
        type: 'BloodRequest',
        requestId,
        requestType: 'donor_request'
      });
    } catch (sockErr) {
      console.error('Socket notification error:', sockErr);
    }

    await logAudit(patientUserId, 'Sent Donor Blood Request', req, `Request ID: ${requestId}, Donor: ${donor.donor_name}, Blood Group: ${bloodGroup}`);

    return res.status(201).json({
      success: true,
      message: `Blood request sent to ${donor.donor_name}. ${emailSent ? 'Email notification delivered.' : 'Email notification failed.'}`,
      requestId,
      emailSent
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Send donor request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send blood request' });
  }
};

/**
 * Get all direct donor requests sent by this patient
 */
exports.getMyDonorRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [requests] = await db.query(
      `SELECT dbr.*, 
              u.name as donor_name, 
              d.blood_group as donor_blood_group,
              d.address as donor_address
       FROM donor_blood_requests dbr
       JOIN donors d ON dbr.donor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE dbr.patient_id = ?
       ORDER BY dbr.created_at DESC`,
      [userId]
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Get my donor requests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
