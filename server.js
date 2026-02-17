const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — সব অনুমতি দাও
app.use(cors({ origin: '*' }));

app.use(express.json());

// টেস্ট রুট
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
    { id: 1, name: "Test Member 1" },
    { id: 2, name: "Test Member 2" }
  ]);
});

app.get('/books', (req, res) => {
  res.json([
    { id: 1, title: "Test Book 1" },
    { id: 2, title: "Test Book 2" }
  ]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`সার্ভার চলছে http://0.0.0.0:${PORT}`);
  console.log(`লাইভ URL: https://library-pro-backend-production.up.railway.app`);
});