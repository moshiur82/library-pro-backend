// db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // ssl অপশন লাগবে না — ?sslmode=require দিয়েই pg অটো SSL হ্যান্ডেল করবে
});

pool.connect()
  .then(client => {
    console.log('PostgreSQL কানেক্ট হয়েছে! Neon Direct DB রেডি।');
    client.release();
  })
  .catch(err => {
    console.error('কানেকশন ফেল:', err.stack);
  });

module.exports = pool;