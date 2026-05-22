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
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'API Key missing' });

    try {
        const messages = req.body.messages;
        const lastMessage = messages[messages.length - 1].content;
        
        // نستخدم الموديل القياسي والمباشر
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "أنت مساعد طبي. " + lastMessage }] }]
        });

        // التأكد من وجود الرد قبل إرساله
        const text = response.data.candidates[0].content.parts[0].text;
        res.json({ content: [{ text: text }] });

    } catch (error) {
        // طباعة تفاصيل الخطأ بدقة
        console.error('Final Error Check:', error.response?.data?.error?.message || error.message);
        res.status(500).json({ error: 'خطأ في الاتصال' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));