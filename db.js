const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // ضروري جداً ليعمل الاتصال مع Render
  }
});

module.exports = pool;