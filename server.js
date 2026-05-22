const express = require('express');
const cors = require('cors'); // مكتبة لحل مشكلة الاتصال
const path = require('path');
const app = express();

// إعدادات Middleware
app.use(cors()); // السماح بالاتصال من أي مكان
app.use(express.json());
app.use(express.static(__dirname)); // يخبر السيرفر أن ملفاتك موجودة هنا

// 1. مسار الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'medical-site.html'));
});

// 2. مسار جلب الأدوية (تأكد من مطابقة اسم الجدول/البيانات عندك)
app.get('/medicines', (req, res) => {
    // ضع هنا كود قاعدة البيانات الخاص بك (مثلاً: const data = await pool.query(...))
    // كمثال بسيط سأضع مصفوفة وهمية، استبدلها بكود قاعدة البيانات الفعلي لديك:
    const medicines = [
        { name: 'بانادول', price: 1.5, stock: 100 },
        { name: 'أوجمنتين', price: 5.0, stock: 50 }
    ];
    res.json(medicines);
});

// إعداد البورت (مهم لـ Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});