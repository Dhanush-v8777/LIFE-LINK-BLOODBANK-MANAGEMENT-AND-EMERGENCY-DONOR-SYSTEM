const db = require('../config/db');

async function logAudit(userId, action, req, details = '') {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown') : 'system';
    
    await db.query(
      'INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES (?, ?, ?, ?)',
      [userId || null, action, ip, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (error) {
    console.error('Audit Log failed:', error);
  }
}

module.exports = {
  logAudit
};
