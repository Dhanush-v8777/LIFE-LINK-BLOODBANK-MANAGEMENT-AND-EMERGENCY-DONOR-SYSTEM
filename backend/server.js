const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const socketUtil = require('./utils/socket');
const authRoutes = require('./routes/authRoutes');
const donorRoutes = require('./routes/donorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const bloodBankRoutes = require('./routes/bloodBankRoutes');
const requestRoutes = require('./routes/requestRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bloodBankRequestRoutes = require('./routes/bloodBankRequestRoutes');
const nearbySearchRoutes = require('./routes/nearbySearchRoutes');

const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketUtil.init(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (for PDF/Excel generated reports if we save them locally, though we pipe streams directly)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/bloodbanks', bloodBankRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bbr', bloodBankRequestRoutes);
app.use('/api/nearby', nearbySearchRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'LifeLink Services are online' });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Exception:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Auto-migration: ensure location columns & hospital_blood_requests table & notification fields exist.
const db = require('./config/db');

async function runAutoMigrations() {
  // 1. Location columns
  const tables = ['donors', 'patients', 'hospitals', 'blood_banks'];
  const columns = [
    { name: 'latitude', definition: 'DECIMAL(10,8) NULL' },
    { name: 'longitude', definition: 'DECIMAL(11,8) NULL' },
    { name: 'location_updated_at', definition: 'DATETIME NULL DEFAULT NULL' }
  ];

  for (const table of tables) {
    for (const col of columns) {
      try {
        const [rows] = await db.query(
          `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [table, col.name]
        );
        if (rows[0].cnt === 0) {
          await db.pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.definition}`);
          console.log(`[MIGRATION] Added column '${col.name}' to '${table}'`);
        }
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          console.error(`[MIGRATION] Failed to add '${col.name}' to '${table}':`, err.message);
        }
      }
    }
  }

  // 2. Notification extra columns
  const notifCols = [
    { name: 'request_id', definition: 'INT NULL' },
    { name: 'request_type', definition: 'VARCHAR(50) NULL' },
    { name: 'is_read', definition: 'BOOLEAN DEFAULT FALSE' }
  ];
  for (const col of notifCols) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = ?`,
        [col.name]
      );
      if (rows[0].cnt === 0) {
        await db.pool.query(`ALTER TABLE notifications ADD COLUMN \`${col.name}\` ${col.definition}`);
        console.log(`[MIGRATION] Added column '${col.name}' to 'notifications'`);
      }
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.error(`[MIGRATION] Failed to add '${col.name}' to 'notifications':`, err.message);
      }
    }
  }

  // 3. Hospital blood requests table
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_blood_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_user_id INT NOT NULL,
        hospital_id INT NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        blood_group VARCHAR(5) NOT NULL,
        units_required INT NOT NULL DEFAULT 1,
        contact_number VARCHAR(20) NOT NULL,
        required_date DATE NOT NULL,
        emergency_notes TEXT NULL,
        status VARCHAR(30) DEFAULT 'Pending',
        rejection_reason TEXT NULL,
        email_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] hospital_blood_requests table verified/created.');
  } catch (err) {
    console.error('[MIGRATION] Failed to create hospital_blood_requests table:', err.message);
  }

  console.log('[MIGRATION] Auto migrations complete.');
}

const PORT = process.env.PORT || 5000;

runAutoMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`LifeLink Backend Server running on port ${PORT}`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`===============================================`);
    });
  })
  .catch((err) => {
    console.error('[MIGRATION] Startup migration failed:', err.message);
    // Start the server anyway so existing features still work
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`LifeLink Backend Server running on port ${PORT} (migration had errors)`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`===============================================`);
    });
  });
