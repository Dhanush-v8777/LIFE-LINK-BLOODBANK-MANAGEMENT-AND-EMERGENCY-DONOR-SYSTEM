const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lifelink_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Enable SSL if required by cloud providers (e.g. TiDB Cloud, Aiven, Railway)
if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(poolConfig);

// Helper function to query
async function query(sql, params) {
  return pool.execute(sql, params);
}

module.exports = {
  pool,
  query
};
