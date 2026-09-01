const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/mail');
const { getOTPEmail, getResetPasswordEmail, getVerificationEmail } = require('../utils/emailTemplates');
const { logAudit } = require('../middleware/auditLogger');
const { generateQRDataURL } = require('../utils/qrGenerator');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifelink_jwt_token_key_12345';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate standard 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper to verify password supporting legacy formats (MD5 hex, SHA-1 hex, SHA-256 hex, plain text)
 * @param {string} inputPassword The plain password entered by the user
 * @param {string} storedHash The password hash/string stored in the database
 */
async function verifyPassword(inputPassword, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return { match: false };
  }

  // 1. First, check if storedHash is a valid bcrypt hash
  const isBcrypt = storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$');
  if (isBcrypt && storedHash.length === 60) {
    try {
      const match = await bcrypt.compare(inputPassword, storedHash);
      if (match) return { match: true, format: 'bcrypt' };
    } catch (e) {
      console.error('[AUTH] Bcrypt comparison failed:', e);
    }
  }

  // 2. MD5 Hex check
  const md5Hex = crypto.createHash('md5').update(inputPassword).digest('hex');
  if (md5Hex === storedHash.toLowerCase()) {
    return { match: true, format: 'md5_hex' };
  }

  // 3. Plain text check
  if (inputPassword === storedHash) {
    return { match: true, format: 'plain_text' };
  }

  // 4. SHA-1 hex check
  const sha1Hex = crypto.createHash('sha1').update(inputPassword).digest('hex');
  if (sha1Hex === storedHash.toLowerCase()) {
    return { match: true, format: 'sha1_hex' };
  }

  // 5. SHA-256 hex check
  const sha256Hex = crypto.createHash('sha256').update(inputPassword).digest('hex');
  if (sha256Hex === storedHash.toLowerCase()) {
    return { match: true, format: 'sha256_hex' };
  }

  return { match: false };
}

exports.register = async (req, res) => {
  const { 
    name, email, password, roleName,
    // Donor / Patient specific
    bloodGroup, dob, gender, phone, address, medicalInfo, availabilityStatus,
    // Hospital / Blood Bank specific
    licenseNumber, contactPerson,
    // GPS location (optional, from browser Geolocation API)
    latitude, longitude
  } = req.body;

  console.log(`[AUTH] Registration request received for email: ${email}, role: ${roleName}`);

  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !password || !name || !roleName) {
    console.warn('[AUTH] Registration failed: Missing required fields');
    return res.status(400).json({ success: false, message: 'Missing required standard registration fields' });
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if user already exists
    const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUsers.length > 0) {
      console.warn(`[AUTH] Registration failed: Email ${normalizedEmail} already exists`);
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    // 2. Resolve Role ID
    const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roles.length === 0) {
      console.warn(`[AUTH] Registration failed: Role name "${roleName}" is invalid`);
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Invalid role name' });
    }
    const roleId = roles[0].id;

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert user
    const [userResult] = await connection.execute(
      'INSERT INTO users (name, email, password, role_id, is_verified) VALUES (?, ?, ?, ?, ?)',
      [name, normalizedEmail, hashedPassword, roleId, false]
    );
    const userId = userResult.insertId;

    // 5. Insert role-specific profile details
    if (roleName === 'Donor') {
      if (!bloodGroup || !dob || !gender || !phone || !address) {
        throw new Error('Missing required donor profile fields');
      }
      await connection.execute(
        'INSERT INTO donors (user_id, blood_group, dob, gender, phone, address, medical_info, availability_status, latitude, longitude, location_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, bloodGroup, dob, gender, phone, address, medicalInfo || '', availabilityStatus || 'Available', latitude || null, longitude || null, latitude ? new Date() : null]
      );
    } else if (roleName === 'Patient') {
      if (!bloodGroup || !dob || !gender || !phone || !address) {
        throw new Error('Missing required patient profile fields');
      }
      await connection.execute(
        'INSERT INTO patients (user_id, blood_group, dob, gender, phone, address, medical_info, latitude, longitude, location_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, bloodGroup, dob, gender, phone, address, medicalInfo || '', latitude || null, longitude || null, latitude ? new Date() : null]
      );
    } else if (roleName === 'Hospital') {
      if (!licenseNumber || !contactPerson || !phone || !address) {
        throw new Error('Missing required hospital profile fields');
      }
      await connection.execute(
        'INSERT INTO hospitals (user_id, name, license_number, contact_person, phone, address, latitude, longitude, location_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, name, licenseNumber, contactPerson, phone, address, latitude || null, longitude || null, latitude ? new Date() : null]
      );
    } else if (roleName === 'Blood Bank Staff') {
      if (!licenseNumber || !contactPerson || !phone || !address) {
        throw new Error('Missing required blood bank profile fields');
      }
      await connection.execute(
        'INSERT INTO blood_banks (user_id, name, license_number, contact_person, phone, address, latitude, longitude, location_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, name, licenseNumber, contactPerson, phone, address, latitude || null, longitude || null, latitude ? new Date() : null]
      );
    }

    // 6. Generate Verification OTP
    const otp = generateOTP();
    console.log('==================================================');
    console.log(`[SMTP SYSTEM] REGISTRATION OTP: ${otp} FOR EMAIL: ${normalizedEmail}`);
    console.log('==================================================');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await connection.execute(
      'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES (?, ?, ?, ?)',
      [normalizedEmail, otp, 'Registration', expiresAt]
    );

    await connection.commit();
    connection.release();

    // 7. Audit log & Send Verification Email
    await logAudit(userId, 'Registration Initialized', req, `User registered under role ${roleName}`);
    
    let emailSent = false;
    try {
      const emailHtml = getOTPEmail(otp, 'Registration Verification');
      await sendEmail({
        to: normalizedEmail,
        subject: 'LifeLink - OTP Registration Verification',
        html: emailHtml,
        text: `Your OTP is ${otp}`
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('[AUTH] Registration email delivery failed:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Registration successful. Verification OTP sent to your email.'
        : 'Registration successful. However, OTP email could not be delivered. Please use Resend OTP or check your spam folder.'
    });
  } catch (error) {
    console.error('[AUTH] Registration error during insert:', error);
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('[AUTH] Rollback failed:', rollbackErr);
    }
    connection.release();
    return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp, type } = req.body;

  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  try {
    // 1. Find OTP
    const [rows] = await db.query(
      'SELECT id, expires_at FROM otp_verifications WHERE email = ? AND otp = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail, otp, type || 'Registration']
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const verificationRecord = rows[0];
    if (new Date() > new Date(verificationRecord.expires_at)) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // 2. Perform actions depending on type
    if (type === 'Registration' || !type) {
      // Mark user as verified
      await db.query('UPDATE users SET is_verified = TRUE WHERE email = ?', [normalizedEmail]);
      
      const [users] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
      if (users.length > 0) {
        await logAudit(users[0].id, 'Email Verified via OTP', req);
      }
    }

    // 3. Delete OTP record (keep PasswordReset OTP until resetPassword runs)
    if (type !== 'PasswordReset') {
      await db.query('DELETE FROM otp_verifications WHERE id = ?', [verificationRecord.id]);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return res.status(500).json({ success: false, message: 'Verification process failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  console.log(`[AUTH] Login request received for: ${normalizedEmail}`);

  if (!normalizedEmail || !password) {
    console.warn('[AUTH] Login request missing email/password');
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    // 1. Fetch user joined with role (supports lookup by email OR name/username)
    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.password, u.is_verified, r.name AS roleName, u.role_id 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ? OR u.name = ?`,
      [normalizedEmail, normalizedEmail]
    );

    if (users.length === 0) {
      console.warn(`[AUTH] Login failed: User matching "${email}" not found`);
      await logAudit(null, 'Failed Login Attempt', req, `Email/Username: ${email} not found`);
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    // 2. Validate Password supporting legacy formats
    const verification = await verifyPassword(password, user.password);
    console.log(`[AUTH] Password comparison result for user ID ${user.id}: ${verification.match ? 'SUCCESS' : 'FAILURE'} (format: ${verification.format || 'none'})`);

    if (!verification.match) {
      await logAudit(user.id, 'Failed Login Attempt', req, 'Incorrect password');
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // 2b. Migrate legacy password format to secure bcrypt hash
    if (verification.format !== 'bcrypt') {
      try {
        console.log(`[AUTH] Upgrading password format for user ${user.email} from ${verification.format} to bcrypt`);
        const newHash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
        console.log(`[AUTH] Password upgraded successfully for user ${user.email}`);
      } catch (migErr) {
        console.error(`[AUTH] Password upgrade failed for user ${user.email}:`, migErr);
      }
    }

    // 3. Check Verification
    if (!user.is_verified) {
      console.log(`[AUTH] User account ${user.email} is unverified, triggering OTP`);
      // Re-trigger OTP
      const otp = generateOTP();
      console.log('==================================================');
      console.log(`[SMTP SYSTEM] RESEND VERIFICATION OTP: ${otp} FOR EMAIL: ${user.email}`);
      console.log('==================================================');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await db.query(
        'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES (?, ?, ?, ?)',
        [user.email, otp, 'Registration', expiresAt]
      );
      
      let emailSent = false;
      try {
        await sendEmail({
          to: user.email,
          subject: 'LifeLink - OTP Registration Verification',
          html: getOTPEmail(otp, 'Registration Verification')
        });
        emailSent = true;
      } catch (mailErr) {
        console.error('Resending verification email failed:', mailErr);
      }

      return res.status(401).json({
        success: false,
        unverified: true,
        emailSent,
        message: emailSent
          ? 'Account not verified. A new verification OTP has been emailed.'
          : 'Account not verified. OTP email could not be delivered — please check spam folder or try Resend OTP.'
      });
    }

    // 4. Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, roleId: user.role_id, roleName: user.roleName, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    console.log(`[AUTH] JWT generated successfully for user ID ${user.id}`);

    // 5. Audit Log
    await logAudit(user.id, 'User Login', req);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.roleName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.resendOTP = async (req, res) => {
  const { email } = req.body;

  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  console.log(`[AUTH] Resend OTP requested for: ${normalizedEmail}`);

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  try {
    // 1. Fetch user to verify existence and verification status
    const [users] = await db.query('SELECT id, is_verified FROM users WHERE email = ?', [normalizedEmail]);
    if (users.length === 0) {
      console.warn(`[AUTH] Resend OTP failed: Email ${normalizedEmail} not found`);
      return res.status(404).json({ success: false, message: 'Account not found with this email' });
    }

    const user = users[0];
    if (user.is_verified) {
      console.warn(`[AUTH] Resend OTP ignored: Email ${normalizedEmail} is already verified`);
      return res.status(400).json({ success: false, message: 'Account is already verified. Please log in.' });
    }

    // 2. Generate and store new OTP
    const otp = generateOTP();
    console.log('==================================================');
    console.log(`[SMTP SYSTEM] RESEND VERIFICATION OTP: ${otp} FOR EMAIL: ${normalizedEmail}`);
    console.log('==================================================');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.query(
      'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES (?, ?, ?, ?)',
      [normalizedEmail, otp, 'Registration', expiresAt]
    );

    // 3. Send email
    let emailSent = false;
    try {
      await sendEmail({
        to: email,
        subject: 'LifeLink - OTP Registration Verification',
        html: getOTPEmail(otp, 'Registration Verification'),
        text: `Your OTP is ${otp}`
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('[AUTH] Resending OTP email failed:', mailErr.message);
    }

    return res.status(200).json({
      success: true,
      emailSent,
      message: emailSent
        ? 'A new verification OTP has been emailed to your address.'
        : 'OTP generated, but email delivery failed. Please check your spam folder or try again later.'
    });
  } catch (error) {
    console.error('[AUTH] Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP code' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  try {
    const [users] = await db.query('SELECT id, name FROM users WHERE email = ?', [normalizedEmail]);
    if (users.length === 0) {
      // Return success even if email not found for privacy
      return res.status(200).json({ success: true, message: 'If email exists, an OTP will be sent shortly' });
    }

    const user = users[0];
    const otp = generateOTP();
    console.log('==================================================');
    console.log(`[SMTP SYSTEM] PASSWORD RESET OTP: ${otp} FOR EMAIL: ${normalizedEmail}`);
    console.log('==================================================');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES (?, ?, ?, ?)',
      [normalizedEmail, otp, 'PasswordReset', expiresAt]
    );

    await logAudit(user.id, 'Password Reset Requested', req);

    let emailSent = false;
    try {
      await sendEmail({
        to: email,
        subject: 'LifeLink - Password Reset OTP',
        html: getOTPEmail(otp, 'Password Reset')
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('Reset password email failed:', mailErr);
    }

    return res.status(200).json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Password reset OTP has been sent to your email.'
        : 'OTP generated, but email delivery failed. Please check your spam folder or try again later.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Process failed' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
  }

  try {
    // 1. Verify OTP
    const [otps] = await db.query(
      'SELECT id, expires_at FROM otp_verifications WHERE email = ? AND otp = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail, otp, 'PasswordReset']
    );

    if (otps.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > new Date(otps[0].expires_at)) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // 2. Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, normalizedEmail]);

    // 3. Clear OTP
    await db.query('DELETE FROM otp_verifications WHERE id = ?', [otps[0].id]);

    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (users.length > 0) {
      await logAudit(users[0].id, 'Password Reset Completed', req);
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
  }

  try {
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    const user = users[0];

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    await logAudit(userId, 'Password Changed', req);

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

exports.getProfile = async (req, res) => {
  const { id, roleName } = req.user;

  try {
    let profileData = null;

    if (roleName === 'Donor') {
      const [donors] = await db.query(
        `SELECT u.name, u.email, d.* 
         FROM users u 
         JOIN donors d ON u.id = d.user_id 
         WHERE u.id = ?`, [id]
      );
      profileData = donors[0];
      if (profileData) {
        // Generate QR code for Donor ID card
        const donorIdText = `LIFELINK-DONOR-${profileData.id}-${profileData.name}-${profileData.blood_group}`;
        profileData.qrCode = await generateQRDataURL(donorIdText);
      }
    } else if (roleName === 'Patient') {
      const [patients] = await db.query(
        `SELECT u.name, u.email, p.* 
         FROM users u 
         JOIN patients p ON u.id = p.user_id 
         WHERE u.id = ?`, [id]
      );
      profileData = patients[0];
    } else if (roleName === 'Hospital') {
      const [hospitals] = await db.query(
        `SELECT u.name, u.email, h.* 
         FROM users u 
         JOIN hospitals h ON u.id = h.user_id 
         WHERE u.id = ?`, [id]
      );
      profileData = hospitals[0];
    } else if (roleName === 'Blood Bank Staff') {
      const [banks] = await db.query(
        `SELECT u.name, u.email, b.* 
         FROM users u 
         JOIN blood_banks b ON u.id = b.user_id 
         WHERE u.id = ?`, [id]
      );
      profileData = banks[0];
    } else if (roleName === 'Admin') {
      const [admins] = await db.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
      profileData = admins[0];
    }

    if (!profileData) {
      return res.status(404).json({ success: false, message: 'Profile details not found' });
    }

    return res.status(200).json({ success: true, profile: profileData });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile details' });
  }
};

exports.updateProfile = async (req, res) => {
  const { id, roleName } = req.user;
  const { name, dob, gender, phone, address, medicalInfo, availabilityStatus, contactPerson } = req.body;

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update general user name
    if (name) {
      await connection.execute('UPDATE users SET name = ? WHERE id = ?', [name, id]);
    }

    // 2. Update role specific profile
    if (roleName === 'Donor') {
      await connection.execute(
        `UPDATE donors SET dob = ?, gender = ?, phone = ?, address = ?, medical_info = ?, availability_status = ? 
         WHERE user_id = ?`,
        [dob, gender, phone, address, medicalInfo || '', availabilityStatus || 'Available', id]
      );
    } else if (roleName === 'Patient') {
      await connection.execute(
        `UPDATE patients SET dob = ?, gender = ?, phone = ?, address = ?, medical_info = ? 
         WHERE user_id = ?`,
        [dob, gender, phone, address, medicalInfo || '', id]
      );
    } else if (roleName === 'Hospital') {
      await connection.execute(
        `UPDATE hospitals SET contact_person = ?, phone = ?, address = ? 
         WHERE user_id = ?`,
        [contactPerson, phone, address, id]
      );
    } else if (roleName === 'Blood Bank Staff') {
      await connection.execute(
        `UPDATE blood_banks SET contact_person = ?, phone = ?, address = ? 
         WHERE user_id = ?`,
        [contactPerson, phone, address, id]
      );
    }

    await connection.commit();
    connection.release();

    await logAudit(id, 'Profile Updated', req);

    return res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.updateLocation = async (req, res) => {
  const { id, roleName } = req.user;
  const { latitude, longitude } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  // Validate coordinate ranges
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: 'Invalid GPS coordinates' });
  }

  try {
    let tableName;
    if (roleName === 'Donor') tableName = 'donors';
    else if (roleName === 'Patient') tableName = 'patients';
    else if (roleName === 'Hospital') tableName = 'hospitals';
    else if (roleName === 'Blood Bank Staff') tableName = 'blood_banks';
    else {
      return res.status(400).json({ success: false, message: 'Location update not available for this role' });
    }

    await db.query(
      `UPDATE ${tableName} SET latitude = ?, longitude = ?, location_updated_at = NOW() WHERE user_id = ?`,
      [lat, lng, id]
    );

    await logAudit(id, 'GPS Location Updated', req, `Coordinates updated for ${roleName}`);

    return res.status(200).json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update location error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};
