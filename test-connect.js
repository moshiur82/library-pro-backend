// test-connect.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT NOW() AS current_time')
  .then(res => {
    console.log('কানেকশন সাকসেস! সার্ভারের সময়:', res.rows[0].current_time);
    pool.end();
  })
  .catch(err => {
    console.error('কানেকশন এরর:', err.message || err.stack);
    pool.end();
  });