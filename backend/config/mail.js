const nodemailer = require('nodemailer');
require('dotenv').config();

// Primary SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify connection configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('==================================================');
    console.error('[SMTP] ❌ SMTP CONNECTION FAILED:', error.message);
    console.error('[SMTP] Emails WILL NOT be delivered until this is fixed.');
    console.error('[SMTP] Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in .env');
    console.error('==================================================');
  } else {
    console.log('[SMTP] Primary SMTP Server is verified and ready to deliver messages');
  }
});

/**
 * Send email with built-in retry mechanism (up to 3 attempts).
 * Throws on failure so callers can inform the user that email was not delivered.
 */
async function sendEmail({ to, subject, html, text }) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'LifeLink Emergency System'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@lifelink.com'}>`,
    to,
    subject,
    text: text || '',
    html: html || ''
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP] ✅ Email dispatched successfully to ${to} on attempt ${attempt}: %s`, info.messageId);
      return info;
    } catch (err) {
      console.warn(`[SMTP] ⚠️ Delivery attempt ${attempt} failed:`, err.message);

      if (attempt >= maxRetries) {
        console.error(`[SMTP] ❌ Email delivery to ${to} FAILED permanently after ${maxRetries} attempts.`);
        throw err;
      }
      // Wait for 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = {
  transporter,
  sendEmail
};
