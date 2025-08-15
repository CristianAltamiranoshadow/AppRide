const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // si usas nube con SSL
});

pool.on('error', (err) => {
  console.error('Error PG Pool:', err.message);
});

module.exports = { pool };
