require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — সব অনুমতি
app.use(cors({ origin: '*' }));

app.use(express.json());

// টেস্ট রুট
app.get('/', (req, res) => {
  res.json({ message: "Backend চলছে! Railway থেকে টেস্ট রেসপন্স" });
});

app.get('/members', (req, res) => {
  res.json([{ id: 1, name: "Test Member" }]); // ডাটাবেস ছাড়া টেস্ট
});

app.get('/books', (req, res) => {
  res.json([{ id: 1, title: "Test Book" }]);
});

app.listen(PORT, () => {
  console.log(`সার্ভার চলছে http://localhost:${PORT}`);
  console.log(`লাইভ URL: https://library-pro-backend-production.up.railway.app`);
});