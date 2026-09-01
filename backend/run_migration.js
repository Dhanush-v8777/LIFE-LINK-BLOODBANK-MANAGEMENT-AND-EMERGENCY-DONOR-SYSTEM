/**
 * Run migrations for hospital blood requests and notification columns.
 * Usage: node run_migration.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lifelink_db',
    multipleStatements: true
  });

  try {
    console.log('Checking notifications table columns...');
    const notifCols = [
      { name: 'request_id', definition: 'INT NULL' },
      { name: 'request_type', definition: 'VARCHAR(50) NULL' },
      { name: 'is_read', definition: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of notifCols) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications' AND COLUMN_NAME = ?`,
        [process.env.DB_NAME || 'lifelink_db', col.name]
      );
      if (rows[0].cnt === 0) {
        await connection.query(`ALTER TABLE notifications ADD COLUMN \`${col.name}\` ${col.definition}`);
        console.log(`Added column '${col.name}' to 'notifications' table.`);
      } else {
        console.log(`Column '${col.name}' already exists in 'notifications' table.`);
      }
    }

    console.log('Checking hospital_blood_requests table...');
    await connection.query(`
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
    console.log('hospital_blood_requests table created/verified successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
