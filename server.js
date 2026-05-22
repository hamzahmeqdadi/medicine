const express = require('express');
const pool = require('./db'); // استيراد الاتصال من ملف db.js
const app = express();

app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('السيرفر يعمل بنجاح ومربوط بقاعدة البيانات!');
});

// مسار تجريبي للتأكد من أن قاعدة البيانات ترد علينا
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: "تم الاتصال بنجاح!",
      currentTime: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({ error: "فشل الاتصال بقاعدة البيانات", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});