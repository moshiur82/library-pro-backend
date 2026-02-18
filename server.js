require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');  // তোমার db.js ফাইল

const app = express();

// পোর্ট — Railway যা দেয় সেটা নেবে, না দিলে 5000
const PORT = process.env.PORT || 5000;

// OPTIONS preflight সরাসরি হ্যান্ডল (CORS error ফিক্স)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

// CORS মিডলওয়্যার
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// ... বাকি কোড একই থাকবে

// CORS — সব origin অনুমতি দাও (Vercel থেকে আসা রিকোয়েস্টের জন্য)
app.use(cors({
  origin: '*',                           // টেস্টের জন্য '*' — পরে specific করতে পারো
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// preflight OPTIONS সব URL-এর জন্য অটো হ্যান্ডল হবে — আলাদা app.options লাগবে না

app.use(express.json());

// লগিং — প্রতিটা রিকোয়েস্ট দেখার জন্য (Railway logs-এ দেখা যাবে)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`);
  next();
});

// টেস্ট রুট — চেক করার জন্য
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend চলছে! Railway থেকে টেস্ট রেসপন্স।',
    actualPort: PORT,
    time: new Date().toISOString()
  });
});

// GET /books — সব বই লিস্ট
app.get('/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id DESC');
    console.log(`Books fetched: ${result.rowCount} rows`);
    res.json(result.rows);
  } catch (err) {
    console.error('Books fetch error:', err.message);
    res.status(500).json({ error: 'বই লিস্ট আনতে সমস্যা হয়েছে' });
  }
});

// GET /members — সব সদস্য লিস্ট
app.get('/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY id DESC');
    console.log(`Members fetched: ${result.rowCount} rows`);
    res.json(result.rows);
  } catch (err) {
    console.error('Members fetch error:', err.message);
    res.status(500).json({ error: 'সদস্য লিস্ট আনতে সমস্যা হয়েছে' });
  }
});

// GET /borrows — ধারের লিস্ট
app.get('/borrows', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        br.id,
        br.book_id,
        b.title AS book_title,
        br.member_id,
        m.name AS member_name,
        br.borrow_date,
        br.due_date,
        br.return_date,
        br.status
      FROM borrow_records br
      JOIN books b ON br.book_id = b.id
      JOIN members m ON br.member_id = m.id
      ORDER BY br.id DESC
    `);
    console.log(`Borrows fetched: ${result.rowCount} rows`);
    res.json(result.rows);
  } catch (err) {
    console.error('Borrows fetch error:', err.message);
    res.status(500).json({ error: 'ধারের লিস্ট আনতে সমস্যা হয়েছে' });
  }
});

// POST /borrow — বই ধার নেওয়া
app.post('/borrow', async (req, res) => {
  const { book_id, member_id } = req.body;

  if (!book_id || !member_id) {
    return res.status(400).json({ error: 'book_id এবং member_id দরকার' });
  }

  try {
    const bookCheck = await pool.query('SELECT available_copies FROM books WHERE id = $1', [book_id]);
    if (bookCheck.rows.length === 0) return res.status(404).json({ error: 'বই পাওয়া যায়নি' });
    if (bookCheck.rows[0].available_copies <= 0) return res.status(400).json({ error: 'এই বই আর উপলব্ধ নেই' });

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(borrowDate.getDate() + 14);

    const borrowResult = await pool.query(
      'INSERT INTO borrow_records (book_id, member_id, borrow_date, due_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [book_id, member_id, borrowDate, dueDate, 'active']
    );

    await pool.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = $1', [book_id]);

    res.status(201).json(borrowResult.rows[0]);
  } catch (err) {
    console.error('Borrow error:', err.message);
    res.status(500).json({ error: 'ধার নিতে সমস্যা হয়েছে' });
  }
});

// PATCH /return/:id — বই ফেরত দেওয়া
app.patch('/return/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const borrowCheck = await pool.query(
      'SELECT * FROM borrow_records WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (borrowCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ধার রেকর্ড পাওয়া যায়নি বা ইতিমধ্যে ফেরত দেওয়া হয়েছে' });
    }

    const returnDate = new Date();

    const updateResult = await pool.query(
      'UPDATE borrow_records SET return_date = $1, status = $2 WHERE id = $3 RETURNING *',
      [returnDate, 'returned', id]
    );

    await pool.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
      [updateResult.rows[0].book_id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Return error:', err.message);
    res.status(500).json({ error: 'বই ফেরত দিতে সমস্যা হয়েছে' });
  }
});

// সার্ভার স্টার্ট — Railway-এর process.env.PORT মেনে চলো
app.listen(PORT, '0.0.0.0', () => {
  console.log(`সার্ভার চলছে http://0.0.0.0:${PORT}`);
  console.log(`লাইভ URL: https://library-pro-backend-production.up.railway.app`);
  console.log(`সময়: ${new Date().toISOString()}`);
  console.log('CORS সক্রিয়: সব origin অনুমতি দেওয়া হয়েছে');
});