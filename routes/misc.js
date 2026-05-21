const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/categories ─────────────────────
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, COUNT(a.id) AS article_count
       FROM categories c
       LEFT JOIN articles a ON a.category_id = c.id AND a.is_published = TRUE
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.id ASC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/contact ────────────────────────
router.post('/contact', [
  body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
  body('email').isEmail().withMessage('البريد غير صحيح').normalizeEmail(),
  body('message').trim().notEmpty().withMessage('الرسالة مطلوبة').isLength({ max: 2000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, subject, message } = req.body;
  try {
    const result = await query(
      'INSERT INTO contacts (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, subject || null, message]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'تم إرسال رسالتك بنجاح، سنتواصل معك قريباً' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── GET /api/contact (admin) ─────────────────
router.get('/contact', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ contacts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// التصدير الصحيح الذي ينتظره ملف server.js
module.exports = router;