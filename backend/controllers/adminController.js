const db = require('../config/db');

async function fetchCount(sql, params = [], fieldKey = 'cnt') {
  try {
    const [rows] = await db.query(sql, params);
    if (rows && rows.length > 0) {
      const val = rows[0][fieldKey] !== undefined ? rows[0][fieldKey] : rows[0][Object.keys(rows[0])[0]];
      return Number(val) || 0;
    }
    return 0;
  } catch (err) {
    console.error(`Count query failed [${sql}]:`, err.message);
    return 0;
  }
}

exports.getAdminDashboardStats = async (req, res) => {
  try {
    const totalUsers = await fetchCount('SELECT COUNT(*) as cnt FROM users');
    const donors = await fetchCount('SELECT COUNT(*) as cnt FROM donors');
    const hospitals = await fetchCount('SELECT COUNT(*) as cnt FROM hospitals');
    const bloodBanks = await fetchCount('SELECT COUNT(*) as cnt FROM blood_banks');
    const patients = await fetchCount('SELECT COUNT(*) as cnt FROM patients');
    const totalRequests = await fetchCount('SELECT COUNT(*) as cnt FROM blood_requests');
    const pendingRequests = await fetchCount('SELECT COUNT(*) as cnt FROM blood_requests WHERE status = "Pending"');
    const completedRequests = await fetchCount('SELECT COUNT(*) as cnt FROM blood_requests WHERE status IN ("Completed", "Fulfilled")');
    const totalDonations = await fetchCount('SELECT COUNT(*) as cnt FROM donations');
    const emergencyRequests = await fetchCount('SELECT COUNT(*) as cnt FROM blood_requests WHERE urgency = "Emergency"');
    const availableStock = await fetchCount('SELECT COALESCE(SUM(volume_ml * units), 0) as cnt FROM blood_inventory WHERE status = "Available" AND expiry_date >= CURDATE()');

    // Chart 1: Blood Group Distribution
    let groupDist = [];
    try {
      const [rows] = await db.query(
        `SELECT blood_group, COALESCE(SUM(volume_ml * units), 0) as volume 
         FROM blood_inventory 
         WHERE status = 'Available' AND expiry_date >= CURDATE()
         GROUP BY blood_group`
      );
      groupDist = rows || [];
    } catch (e) {
      console.error('Group distribution query failed:', e.message);
    }

    // Chart 2: Donation Trends (Monthly counts)
    let donationTrends = [];
    try {
      const [rows] = await db.query(
        `SELECT MONTHNAME(donation_date) as month, COUNT(*) as count 
         FROM donations 
         GROUP BY MONTHNAME(donation_date), MONTH(donation_date) 
         ORDER BY MONTH(donation_date)`
      );
      donationTrends = rows || [];
    } catch (e) {
      console.error('Donation trends query failed:', e.message);
    }

    // Chart 3: Request Trends (Monthly counts)
    let requestTrends = [];
    try {
      const [rows] = await db.query(
        `SELECT MONTHNAME(created_at) as month, COUNT(*) as count 
         FROM blood_requests 
         GROUP BY MONTHNAME(created_at), MONTH(created_at) 
         ORDER BY MONTH(created_at)`
      );
      requestTrends = rows || [];
    } catch (e) {
      console.error('Request trends query failed:', e.message);
    }

    // Chart 4: Stock Category distribution
    let componentDist = [];
    try {
      const [rows] = await db.query(
        `SELECT component, COALESCE(SUM(volume_ml * units), 0) as volume 
         FROM blood_inventory 
         WHERE status = 'Available' AND expiry_date >= CURDATE()
         GROUP BY component`
      );
      componentDist = rows || [];
    } catch (e) {
      console.error('Component distribution query failed:', e.message);
    }

    // Audit logs (last 20 logs)
    let auditLogs = [];
    try {
      const [rows] = await db.query(
        `SELECT al.*, u.email as user_email 
         FROM audit_logs al 
         LEFT JOIN users u ON al.user_id = u.id 
         ORDER BY al.created_at DESC 
         LIMIT 20`
      );
      auditLogs = rows || [];
    } catch (e) {
      console.error('Audit logs query failed:', e.message);
    }

    const recentActivities = auditLogs.length;

    return res.status(200).json({
      success: true,
      stats: {
        users: totalUsers,
        totalUsers,
        donors,
        hospitals,
        bloodBanks,
        patients,
        totalRequests,
        pendingRequests,
        completedRequests,
        totalDonations,
        emergencyRequests,
        availableStock: availableStock || 0,
        recentActivities
      },
      charts: {
        groupDistribution: groupDist,
        donationTrends,
        requestTrends,
        componentDistribution: componentDist
      },
      auditLogs
    });
  } catch (error) {
    console.error('Admin dashboard stats retrieval failed:', error);
    return res.status(200).json({
      success: true,
      stats: {
        users: 0,
        totalUsers: 0,
        donors: 0,
        hospitals: 0,
        bloodBanks: 0,
        patients: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        totalDonations: 0,
        emergencyRequests: 0,
        availableStock: 0,
        recentActivities: 0
      },
      charts: {
        groupDistribution: [],
        donationTrends: [],
        requestTrends: [],
        componentDistribution: []
      },
      auditLogs: []
    });
  }
};

exports.getDonors = async (req, res) => {
  try {
    const [donors] = await db.query(
      `SELECT d.*, u.name, u.email, u.is_verified 
       FROM donors d 
       JOIN users u ON d.user_id = u.id 
       ORDER BY u.name ASC`
    );
    return res.status(200).json({ success: true, donors });
  } catch (error) {
    console.error('Failed to get donors registry:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving donors registry list' });
  }
};

exports.getHospitals = async (req, res) => {
  try {
    const [hospitals] = await db.query(
      `SELECT h.*, u.name as user_name, u.email, u.is_verified 
       FROM hospitals h 
       JOIN users u ON h.user_id = u.id 
       ORDER BY h.name ASC`
    );
    return res.status(200).json({ success: true, hospitals });
  } catch (error) {
    console.error('Failed to get hospitals:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving hospitals list' });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT r.*, u.name as requester_name, u.email as requester_email 
       FROM blood_requests r 
       JOIN users u ON r.requester_id = u.id 
       ORDER BY r.created_at DESC`
    );
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Failed to get requests:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving requests registry' });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const [inventory] = await db.query(
      `SELECT bi.*, bb.name as blood_bank_name 
       FROM blood_inventory bi 
       JOIN blood_banks bb ON bi.blood_bank_id = bb.id 
       ORDER BY bi.expiry_date ASC`
    );
    return res.status(200).json({ success: true, inventory });
  } catch (error) {
    console.error('Failed to get inventory:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving blood inventory list' });
  }
};
