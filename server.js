require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// المسار الذكي للذكاء الاصطناعي
app.post('/ask-ai', async (req, res) => {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات الخادم.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        
        // تم تغيير الموديل إلى gemini-1.5-pro لضمان التوافق التام
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const messages = req.body.messages;
        const lastMessage = messages[messages.length - 1].content;
        const systemPrompt = "أنت مساعد طبي تثقيفي. قدم معلومات طبية عامة ولا تقدم تشخيصاً. في حالات الطوارئ اطلب التوجه للطوارئ. ";
        
        const result = await model.generateContent(systemPrompt + lastMessage);
        const response = await result.response;
        const text = response.text();

        res.json({ content: [{ text: text }] });
    } catch (error) {
        console.error('Gemini Error:', error);
        res.status(500).json({ error: 'خطأ في الاتصال بالذكاء الاصطناعي' });
    }
});

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));