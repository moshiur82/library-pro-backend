const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;  // হার্ডকোড 5000 — Railway-এর expose পোর্টের সাথে মিলবে

// CORS — সব অনুমতি দাও (টেস্টের জন্য)
app.use(cors({ origin: '*' }));

app.use(express.json());

// টেস্ট রুট — চেক করার জন্য
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend চলছে! Railway থেকে টেস্ট রেসপন্স।',
    port: PORT,
    time: new Date().toISOString()
  });
});

app.get('/members', (req, res) => {
  res.json([
    { id: 1, name: "Test Member 1", email: "test1@example.com" },
    { id: 2, name: "Test Member 2", email: "test2@example.com" }
  ]);
});

app.get('/books', (req, res) => {
  res.json([
    { id: 1, title: "Test Book 1", author: "Author One" },
    { id: 2, title: "Test Book 2", author: "Author Two" }
  ]);
});

app.get('/borrows', (req, res) => {
  res.json([
    { id: 1, book_id: 1, member_id: 1, status: "active" },
    { id: 2, book_id: 2, member_id: 2, status: "returned" }
  ]);
});

// সার্ভার স্টার্ট — 0.0.0.0 দিয়ে লিসেন করো (Railway-এর জন্য জরুরি)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`সার্ভার চলছে http://0.0.0.0:${PORT}`);
  console.log(`লাইভ URL: https://library-pro-backend-production.up.railway.app`);
  console.log(`সময়: ${new Date().toISOString()}`);
});