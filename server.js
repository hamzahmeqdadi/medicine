const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// إعداد الاتصال بقاعدة البيانات بشكل مباشر لتجاوز مشاكل قراءة ملف الـ .env
const pool = new Pool({
    user: 'postgres',         // اسم المستخدم الصحيح
    host: 'localhost',        // السيرفر المحلي
    database: 'sehhtak_db',   // اسم قاعدة البيانات التي أنشأناها
    password: '1234',         // كلمة المرور
    port: 5432,               // المنفذ الافتراضي لـ PostgreSQL
});

// التحقق من الاتصال
pool.connect((err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات sehhtak_db بنجاح!');
    }
});

// المسارات (Routes)
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const articleRoutes = require('./routes/articles');
const miscRoutes = require('./routes/misc');

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api', miscRoutes);

app.get('/', (req, res) => {
    res.send('السيرفر يعمل بنجاح!');
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'حدث خطأ داخلي في السيرفر!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`   السيرفر يعمل الآن بنجاح على منفذ: ${PORT}   `);
    console.log(`=============================================`);
});