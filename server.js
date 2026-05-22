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
        const systemPrompt = "أنت مساعد طبي. أجب باختصار.";

        // 1. الاستعلام عن قائمة الموديلات المتاحة في حسابك
        const modelsResponse = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
        
        // 2. اختيار موديل يدعم generateContent
        const validModel = modelsResponse.data.models.find(m => m.supportedMethods.includes('generateContent'));
        const modelName = validModel.name; // هذا سيجلب الاسم الصحيح والمقبول من جوجل

        // 3. إرسال الطلب باستخدام الموديل المكتشف
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_KEY}`, {
            contents: [{ parts: [{ text: systemPrompt + lastMessage }] }]
        });

        res.json({ content: [{ text: response.data.candidates[0].content.parts[0].text }] });

    } catch (error) {
        console.error('Error Details:', error.response?.data?.error || error.message);
        res.status(500).json({ error: 'تعذر الاتصال بالموديل الصحيح' });
    }
});

app.listen(3000, () => console.log('Server running on 3000'));