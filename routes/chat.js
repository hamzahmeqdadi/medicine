const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { body, validationResult } = require('express-validator');
const { query } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MEDICAL_SYSTEM_PROMPT = `أنت مساعد طبي تثقيفي على منصة "صحتك+". تقدم معلومات طبية عامة وتثقيفية باللغة العربية.

القواعد الأساسية:
- قدم معلومات طبية عامة وموثوقة بأسلوب واضح وسهل الفهم
- عند الحديث عن أعراض، ذكّر المستخدم دائماً أن هذه معلومات عامة وليست تشخيصاً
- اذكر متى يجب استشارة الطبيب فوراً إن كانت الحالة خطيرة
- لا تعطِ جرعات أدوية محددة أو وصفات طبية
- في حالات الطوارئ (ألم صدر شديد، صعوبة تنفس، فقدان وعي) اطلب من المستخدم طلب الإسعاف فوراً
- نظّم إجاباتك بنقاط عند الحاجة لسهولة القراءة
- كن دافئاً ومتعاطفاً في أسلوبك
- لا تتجاوز 400 كلمة في كل إجابة ما لم يكن الموضوع يستدعي التفصيل`;

// ─── GET /api/chat/sessions ──────────────────
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT cs.id, cs.title, cs.created_at,
        (SELECT content FROM chat_messages
         WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chat_sessions cs
       WHERE cs.user_id = $1
       ORDER BY cs.updated_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/chat/sessions ─────────────────
router.post('/sessions', optionalAuth, async (req, res) => {
  try {
    const sessionKey = req.user ? null : uuidv4();
    const result = await query(
      `INSERT INTO chat_sessions (user_id, session_key)
       VALUES ($1, $2) RETURNING id, title, session_key, created_at`,
      [req.user?.id || null, sessionKey]
    );
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── GET /api/chat/sessions/:id/messages ─────
router.get('/sessions/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify access
    const session = await query(
      'SELECT * FROM chat_sessions WHERE id = $1', [id]
    );
    if (!session.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    const s = session.rows[0];
    if (s.user_id && s.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'غير مسموح' });
    }

    const messages = await query(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE session_id = $1 AND role != 'system'
       ORDER BY created_at ASC`,
      [id]
    );
    res.json({ messages: messages.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/chat/sessions/:id/messages ────
router.post('/sessions/:id/messages', optionalAuth, [
  body('content').trim().notEmpty().withMessage('الرسالة مطلوبة').isLength({ max: 2000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id } = req.params;
  const { content } = req.body;

  try {
    // Verify session access
    const sessionRes = await query('SELECT * FROM chat_sessions WHERE id = $1', [id]);
    if (!sessionRes.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    const session = sessionRes.rows[0];
    if (session.user_id && session.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'غير مسموح' });
    }

    // Save user message
    await query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1,$2,$3)',
      [id, 'user', content]
    );

    // Fetch last 10 messages for context
    const historyRes = await query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1 AND role != 'system'
       ORDER BY created_at DESC LIMIT 10`,
      [id]
    );
    const history = historyRes.rows.reverse();

    // Call Claude
    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: MEDICAL_SYSTEM_PROMPT,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    });

    const assistantContent = aiResponse.content[0].text;
    const tokensUsed = aiResponse.usage?.input_tokens + aiResponse.usage?.output_tokens || 0;

    // Save assistant reply
    const saved = await query(
      `INSERT INTO chat_messages (session_id, role, content, tokens_used)
       VALUES ($1,'assistant',$2,$3) RETURNING id, role, content, created_at`,
      [id, assistantContent, tokensUsed]
    );

    // Update session title if it's the first real message
    if (history.length <= 1) {
      const shortTitle = content.substring(0, 60);
      await query('UPDATE chat_sessions SET title = $1 WHERE id = $2', [shortTitle, id]);
    }

    res.json({ message: saved.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الاتصال بالمساعد الذكي' });
  }
});

// ─── DELETE /api/chat/sessions/:id ───────────
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    res.json({ message: 'تم حذف المحادثة' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/chat/symptom-check ────────────
router.post('/symptom-check', optionalAuth, [
  body('symptoms').isArray({ min: 1, max: 10 }).withMessage('أدخل عرضاً واحداً على الأقل'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { symptoms, session_key } = req.body;
  try {
    const prompt = `المريض يعاني من الأعراض التالية: ${symptoms.join('، ')}.\n\nقدم معلومات طبية عامة عن هذه الأعراض مجتمعةً، ما الذي قد تدل عليه، ومتى يجب استشارة الطبيب فوراً. تذكر: هذه معلومات عامة وليست تشخيصاً.`;

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: MEDICAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const aiText = aiResponse.content[0].text;

    await query(
      `INSERT INTO symptom_checks (user_id, session_key, symptoms, ai_response)
       VALUES ($1,$2,$3,$4)`,
      [req.user?.id || null, session_key || null, symptoms, aiText]
    );

    res.json({ response: aiText, symptoms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تحليل الأعراض' });
  }
});

module.exports = router;