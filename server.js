const express = require('express');
const path = require('path'); // 1. أضف هذا السطر
const app = express();

// 2. أضف هذا السطر لإخبار السيرفر بمكان ملفاتك (HTML, CSS, JS)
app.use(express.static(__dirname));

// 3. أضف هذا المسار ليعرض ملف medical-site.html عند فتح الرابط الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'medical-site.html'));
});

// ... تأكد من وجود مسار الأدوية هنا كما كان سابقاً
app.get('/medicines', (req, res) => {
    // كود جلب الأدوية من قاعدة البيانات
});

// اجعل السيرفر يستمع على البورت (أو بورت Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));