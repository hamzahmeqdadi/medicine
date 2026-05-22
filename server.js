require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/ask-ai', async (req, res) => {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'مفتاح API مفقود.' });
    }

    try {
        const messages = req.body.messages;
        const lastMessage = messages[messages.length - 1].content;
        const systemPrompt = "أنت مساعد طبي تثقيفي. قدم معلومات طبية عامة ولا تقدم تشخيصاً. في حالات الطوارئ اطلب التوجه للطوارئ. ";

        // الاتصال المباشر بـ Google Gemini API
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
            {
                contents: [{ parts: [{ text: systemPrompt + lastMessage }] }]
            }
        );

        const reply = response.data.candidates[0].content.parts[0].text;
        res.json({ content: [{ text: reply }] });

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'خطأ في الاتصال بالذكاء الاصطناعي' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));