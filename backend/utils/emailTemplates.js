/**
 * HTML Email templates for LifeLink
 */

const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f7f9fc;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #dc2626;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #dc2626;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      background-color: #fee2e2;
      color: #dc2626;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LifeLink</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Blood Bank & Emergency Matching System</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from LifeLink Emergency System. Please do not reply directly to this email.</p>
      <p>&copy; 2026 LifeLink Systems. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = {
  getVerificationEmail: (name, link) => {
    return baseTemplate('Verify Your Email', `
      <h2>Welcome to LifeLink, ${name}!</h2>
      <p>Thank you for registering. Please verify your email address to complete your account setup and unlock full access to the LifeLink dashboard.</p>
      <div style="text-align: center;">
        <a href="${link}" class="btn">Verify Email Address</a>
      </div>
      <p>If you cannot click the button, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; font-size: 13px; color: #64748b;">${link}</p>
    `);
  },

  getOTPEmail: (otp, purpose = 'Verification') => {
    return baseTemplate('Your OTP Verification Code', `
      <h2>Security Verification Code</h2>
      <p>Use the following One-Time Password (OTP) to complete your ${purpose.toLowerCase()} process. This code is valid for 10 minutes.</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #dc2626; border: 2px dashed #dc2626; padding: 10px 20px; border-radius: 6px; background-color: #fff5f5;">${otp}</span>
      </div>
      <p>If you did not request this, please secure your account credentials immediately.</p>
    `);
  },

  getResetPasswordEmail: (name, link) => {
    return baseTemplate('Reset Your Password', `
      <h2>Hello, ${name}</h2>
      <p>We received a request to reset your password for your LifeLink account. Click the button below to choose a new password.</p>
      <div style="text-align: center;">
        <a href="${link}" class="btn">Reset Password</a>
      </div>
      <p>This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      <p style="word-break: break-all; font-size: 13px; color: #64748b;">${link}</p>
    `);
  },

  getEmergencyRequestEmail: (donorName, bloodGroup, component, volume, patientName, address) => {
    return baseTemplate('URGENT: Emergency Blood Donor Match Found!', `
      <h2>Emergency Match Alert!</h2>
      <p>Dear <strong>${donorName}</strong>,</p>
      <p>You have been identified as an eligible available donor for an emergency blood request in your area.</p>
      <div style="background-color: #fff5f5; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 5px 0;"><strong>Patient:</strong> ${patientName}</p>
        <p style="margin: 5px 0;"><strong>Blood Type Needed:</strong> <span class="badge">${bloodGroup}</span></p>
        <p style="margin: 5px 0;"><strong>Component:</strong> ${component}</p>
        <p style="margin: 5px 0;"><strong>Required Volume:</strong> ${volume} ml</p>
        <p style="margin: 5px 0;"><strong>Delivery Location:</strong> ${address}</p>
      </div>
      <p>Please log in to your dashboard to ACCEPT or DECLINE this request immediately. Your contribution could save a life today.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard" class="btn">View Emergency Request</a>
      </div>
    `);
  },

  getDonationReminderEmail: (donorName, lastDonationDate, nextEligibleDate) => {
    return baseTemplate('Ready to Save Another Life? Donation Reminder', `
      <h2>Hello ${donorName},</h2>
      <p>It has been over 3 months since your last blood donation on ${lastDonationDate}. You are now eligible to donate blood again!</p>
      <p>Patients and hospitals depend on regular donors like you to maintain a healthy blood supply. Please schedule your next donation today.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard" class="btn">Schedule Donation Now</a>
      </div>
      <p>Thank you for being a lifesaver!</p>
    `);
  },

  getRequestApprovalEmail: (requesterName, bloodGroup, component, volume) => {
    return baseTemplate('Blood Request Approved', `
      <h2>Blood Request Approved</h2>
      <p>Dear ${requesterName},</p>
      <p>We are pleased to inform you that your request for <strong>${volume}ml of ${bloodGroup} (${component})</strong> has been APPROVED.</p>
      <p>The units are being prepared and will be dispatched to the delivery address specified in the request shortly.</p>
      <p>You can track the distribution status in your dashboard.</p>
    `);
  },

  getRequestRejectionEmail: (requesterName, bloodGroup, component, reason) => {
    return baseTemplate('Update Regarding Blood Request', `
      <h2>Blood Request Status Update</h2>
      <p>Dear ${requesterName},</p>
      <p>We regret to inform you that your request for <strong>${bloodGroup} (${component})</strong> could not be approved at this time.</p>
      <p><strong>Reason:</strong> ${reason || 'Insufficient stock or unmatched medical criteria'}</p>
      <p>If this is an emergency, please create a new request with the "Emergency" flag, which will trigger donor alerts, or contact our support.</p>
    `);
  },

  getRequestCompletionEmail: (requesterName, bloodGroup, component, volume) => {
    return baseTemplate('Blood Request Dispatched & Fulfilled', `
      <h2>Blood Request Completed</h2>
      <p>Dear ${requesterName},</p>
      <p>Your request for <strong>${volume}ml of ${bloodGroup} (${component})</strong> has been successfully fulfilled and delivered.</p>
      <p>Thank you for using LifeLink.</p>
    `);
  },

  getLowStockAlertEmail: (bankName, bloodGroup, component, currentStock) => {
    return baseTemplate('CRITICAL ALERT: Low Blood Inventory Stock', `
      <h2 style="color: #dc2626;">Low Stock Warning!</h2>
      <p>Dear Staff at ${bankName},</p>
      <p>Our real-time stock monitor has detected a critical shortage in your inventory.</p>
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Blood Group:</strong> <span class="badge">${bloodGroup}</span></p>
        <p style="margin: 5px 0;"><strong>Component:</strong> ${component}</p>
        <p style="margin: 5px 0; color: #dc2626;"><strong>Current Volume:</strong> ${currentStock} ml (Below Critical Threshold)</p>
      </div>
      <p>Please schedule collection drives or coordinate with regional blood banks to replenish inventory levels immediately.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard" class="btn">Manage Inventory</a>
      </div>
    `);
  },

  getExpiryAlertEmail: (bankName, unitsCount) => {
    return baseTemplate('Notification: Blood Units Expiry Warning', `
      <h2>Blood Expiry Warning</h2>
      <p>Dear Staff at ${bankName},</p>
      <p>This is to notify you that <strong>${unitsCount} blood unit(s)</strong> in your inventory are expiring within the next 48 hours.</p>
      <p>Please review your inventory records and ensure these units are marked for testing, distributed, or properly disposed of in compliance with guidelines.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173/dashboard" class="btn">View Expiring Inventory</a>
      </div>
    `);
  },

  // Patient -> Donor direct blood request email (matches exact specification)
  getDonorBloodRequestEmail: (donorName, bloodGroup, patientName) => {
    return baseTemplate('Urgent Blood Request - LifeLink', `
      <p>Dear Donor,</p>
      <p>A patient is requesting blood and may need your assistance.</p>
      <div style="background-color: #fff5f5; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 5px 0;"><strong>Blood Group Required:</strong> <span class="badge">${bloodGroup}</span></p>
        <p style="margin: 5px 0;"><strong>Requested by:</strong> ${patientName}</p>
      </div>
      <p>Please log in to your LifeLink account to view the request and respond.</p>
      <p>Your contribution can help save a life.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173/donor/blood-requests" class="btn">View Request</a>
      </div>
      <p style="margin-top: 20px;">Thank you,<br><strong>LifeLink Emergency Blood Management System</strong></p>
    `);
  },

  // Notification when donor becomes eligible again after 56 days
  getDonorEligibleAgainEmail: (donorName) => {
    return baseTemplate('You Are Eligible to Donate Again - LifeLink', `
      <h2>Great News, ${donorName}!</h2>
      <p>Your 56-day donation cooldown period has ended. You are now <strong>eligible to donate blood again</strong>!</p>
      <p>Patients and hospitals depend on regular donors like you to maintain a healthy blood supply. If you're available, please update your status and consider responding to any pending requests.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173/donor/dashboard" class="btn">Go to My Dashboard</a>
      </div>
      <p>Thank you for being a lifesaver!</p>
    `);
  }
};
