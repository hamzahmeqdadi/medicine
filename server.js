const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

app.use(express.json()); // ضروري لقراءة البيانات المرسلة
app.use(cors());

// 1. عرض كل الأدوية
app.get('/medicines', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicines');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. إضافة دواء جديد
app.post('/medicines', async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const newMed = await pool.query(
      'INSERT INTO medicines (name, price, stock) VALUES ($1, $2, $3) RETURNING *',
      [name, price, stock]
    );
    res.json(newMed.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));