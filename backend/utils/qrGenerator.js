const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

async function generateQRDataURL(text) {
  try {
    const dataUrl = await QRCode.toDataURL(text);
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR Data URL:', error);
    throw error;
  }
}

async function saveQRCodeToFile(text, fileName) {
  try {
    const uploadDir = path.join(__dirname, '../uploads/qrcodes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    await QRCode.toFile(filePath, text);
    return `/uploads/qrcodes/${fileName}`;
  } catch (error) {
    console.error('Failed to save QR Code file:', error);
    throw error;
  }
}

module.exports = {
  generateQRDataURL,
  saveQRCodeToFile
};
