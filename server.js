// Load environment variables from .env when present
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // تأكد من تثبيت axios: npm install axios
const {GoogleGenerativeAI} = require('@google/generative-ai');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
    // ملف index.html موجود في المشروع، نستخدمه كصفحة رئيسية
    res.sendFile(path.join(__dirname, 'index.html'));
});

// مسار وسيط للذكاء الاصطناعي (آمن ومخفي)
app.post('/ask-ai', async (req, res) => {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY;

    if (!GEMINI_KEY && !ANTHROPIC_KEY) {
        console.error('Missing AI API key. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in .env.');
        return res.status(500).json({ error: 'مفتاح AI غير موجود على الخادم. الرجاء إعداد متغير البيئة GEMINI_API_KEY أو ANTHROPIC_API_KEY.' });
    }

    try {
        let response;

        if (GEMINI_KEY) {
            const promptText = req.body.messages
                .map(msg => `${msg.role === 'user' ? 'المستخدم' : msg.role === 'assistant' ? 'المساعد' : 'النظام'}: ${msg.content}`)
                .join('\n');

            let modelName = GEMINI_MODEL;
            if (!modelName.startsWith('models/')) {
                modelName = `models/${modelName}`;
            }

            const client = new GoogleGenerativeAI(GEMINI_KEY);
            const model = client.getGenerativeModel({ model: modelName });
            const genRequest = {
                contents: [
                    {
                        role: 'user',
                        parts: [ { text: promptText } ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1000,
                    candidateCount: 1
                }
            };

            const result = await model.generateContent(genRequest);
            const response = result?.response;
            const candidate = response?.candidates?.[0];
            const reply = candidate?.content?.parts?.map(p => p.text).join('') || 'عذراً، حدث خطأ أثناء توليد الرد.';
            return res.json({ content: [{ text: reply }] });
        }

        response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: req.body.messages,
            system: "أنت مساعد طبي تثقيفي باللغة العربية على موقع 'صحتك+'. مهمتك تقديم معلومات طبية عامة وتثقيفية واضحة ومفيدة. لا تقدم تشخيصاً طبياً، ولا تعطي جرعات أدوية، وفي حالات الطوارئ اطلب التوجه للطوارئ."
        }, {
            headers: {
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error calling AI API:', error?.response?.data || error.message || error);
        res.status(500).json({ error: 'خطأ في الاتصال بالذكاء الاصطناعي' });
    }
});

// Health check
app.get('/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));