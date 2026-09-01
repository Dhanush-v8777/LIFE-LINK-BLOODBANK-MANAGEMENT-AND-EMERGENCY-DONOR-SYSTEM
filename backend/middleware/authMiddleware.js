const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifelink_jwt_token_key_12345';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, roleId, roleName, name }
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roleName) {
      return res.status(403).json({ success: false, message: 'Unauthorized Access: Role missing' });
    }

    const userRole = (req.user.roleName || '').toLowerCase().trim();
    const isAllowed = allowedRoles.some(role => {
      const r = role.toLowerCase().trim();
      if (r === 'blood bank staff' || r === 'blood bank') {
        return /^blood\s*bank/i.test(userRole) || /^staff$/i.test(userRole);
      }
      return r === userRole;
    });

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: `Access Forbidden for role: ${req.user.roleName}` });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  authorizeRoles
};
