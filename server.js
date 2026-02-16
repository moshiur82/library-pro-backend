require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS সেটিং — dynamic origin check (wildcard ভুল সরানো)
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://library-pro-beryl.vercel.app',
      'https://library-pro-beryl-git-main-moshiur82.vercel.app'
    ];

    // origin না থাকলে বা allowed list-এ থাকলে → অনুমতি দাও
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// JSON পার্সিং
app.use(express.json());

// GET /books - সব বইয়ের লিস্ট
app.get('/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Books fetch error:', err.message);
    res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে' });
  }
});

// POST /books - নতুন বই যোগ
app.post('/books', async (req, res) => {
  try {
    const { title, author, isbn, category, total_copies } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title এবং Author দরকার' });
    }

    const result = await pool.query(
      'INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $5) RETURNING *',
      [title, author, isbn || null, category || null, total_copies || 1]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Book add error:', err.message);
    res.status(500).json({ error: 'বই যোগ করতে সমস্যা হয়েছে' });
  }
});

// GET /members - সব সদস্যের লিস্ট
app.get('/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Members fetch error:', err.message);
    res.status(500).json({ error: 'সদস্য লিস্ট আনতে সমস্যা হয়েছে' });
  }
});

// POST /members - নতুন সদস্য যোগ
app.post('/members', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name এবং Email দরকার' });
    }

    const result = await pool.query(
      'INSERT INTO members (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone || null, address || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Member add error:', err.message);
    res.status(500).json({ error: 'সদস্য যোগ করতে সমস্যা হয়েছে' });
  }
});

// POST /borrow - বই ধার নেওয়া
app.post('/borrow', async (req, res) => {
  try {
    const { book_id, member_id } = req.body;

    if (!book_id || !member_id) {
      return res.status(400).json({ error: 'book_id এবং member_id দরকার' });
    }

    const bookCheck = await pool.query('SELECT available_copies FROM books WHERE id = $1', [book_id]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'বই পাওয়া যায়নি' });
    }
    if (bookCheck.rows[0].available_copies <= 0) {
      return res.status(400).json({ error: 'এই বই আর উপলব্ধ নেই' });
    }

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(borrowDate.getDate() + 14);

    const borrowResult = await pool.query(
      'INSERT INTO borrow_records (book_id, member_id, borrow_date, due_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [book_id, member_id, borrowDate, dueDate, 'active']
    );

    await pool.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
      [book_id]
    );

    res.status(201).json(borrowResult.rows[0]);
  } catch (err) {
    console.error('Borrow error:', err.message);
    res.status(500).json({ error: 'ধার নিতে সমস্যা হয়েছে' });
  }
});

// PATCH /return/:id - বই ফেরত দেওয়া
app.patch('/return/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const borrowCheck = await pool.query(
      'SELECT * FROM borrow_records WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (borrowCheck.rows.length === 0) {
      return res.status(404).json({ error: 'এই ধার রেকর্ড পাওয়া যায়নি বা ইতিমধ্যে ফেরত দেওয়া হয়েছে' });
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

// GET /borrows - সব ধারের লিস্ট
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
    res.json(result.rows);
  } catch (err) {
    console.error('Borrows fetch error:', err.message);
    res.status(500).json({ error: 'ধারের লিস্ট আনতে সমস্যা হয়েছে' });
  }
});

// সার্ভার চালু
app.listen(PORT, () => {
  console.log(`সার্ভার চলছে http://localhost:${PORT}`);
  console.log(`লাইভ URL: https://library-pro-backend-production.up.railway.app`);
});