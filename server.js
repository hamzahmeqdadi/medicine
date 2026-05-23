require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/ask-ai', async (req, res) => {
    // جلب المفتاح من إعدادات البيئة (Render Environment Variables)
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_KEY) {
        console.error('Error: API Key is missing in environment variables');
        return res.status(500).json({ error: 'API Key missing' });
    }

    try {
        const { messages } = req.body;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'No messages provided' });
        }
        
        const lastMessage = messages[messages.length - 1].content;
        
        // استخدام رابط مستقر ومجرب لموديل gemini-1.5-flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{
                role: "user",
                parts: [{ text: "أنت مساعد طبي ذكي. أجب على السؤال التالي بوضوح واختصار: " + lastMessage }]
            }]
        });

        // التأكد من أن الهيكل صحيح قبل استخراج النص
        if (response.data && response.data.candidates && response.data.candidates[0].content) {
            const text = response.data.candidates[0].content.parts[0].text;
            res.json({ content: [{ text: text }] });
        } else {
            throw new Error('Invalid response structure from Gemini API');
        }

    } catch (error) {
        // طباعة تفاصيل الخطأ في الـ Logs لتسهيل اكتشاف المشكلة
        console.error('API Error Details:', error.response?.data?.error || error.message);
        res.status(500).json({ error: 'خطأ في الاتصال بالذكاء الاصطناعي' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));