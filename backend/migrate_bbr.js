const db = require('./config/db');

async function migrate() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS blood_bank_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_user_id INT NOT NULL,
        blood_bank_id INT NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        blood_group VARCHAR(5) NOT NULL,
        units_required INT NOT NULL DEFAULT 1,
        hospital_name VARCHAR(255) NULL,
        contact_number VARCHAR(20) NOT NULL,
        required_date DATE NOT NULL,
        emergency_notes TEXT NULL,
        status VARCHAR(30) DEFAULT 'Pending',
        rejection_reason TEXT NULL,
        email_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
      )
    `);
    console.log('blood_bank_requests table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
