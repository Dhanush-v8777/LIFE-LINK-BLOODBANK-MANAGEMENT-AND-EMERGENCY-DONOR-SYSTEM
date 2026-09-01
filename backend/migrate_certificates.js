const fs = require('fs');
const path = require('path');
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
    const sqlPath = path.join(__dirname, '..', 'sql', 'migration_certificates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running certificates migration...');
    await connection.query(sql);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
