const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth'); 

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── POST /api/auth/register ─────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
  body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, phone, gender, birth_date } = req.body;
  
  try {
    // التحقق مما إذا كان المستخدم موجوداً
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });

    const hash = await bcrypt.hash(password, 12);
    
    // إدراج المستخدم مع الحقول الإضافية لتجنب خطأ القيود (Constraints)
    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, gender, birth_date, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, name, email, role`,
      [
        name, 
        email, 
        hash, 
        phone || null, 
        gender || null, 
        birth_date || null, 
        'user',   // الدور الافتراضي
        false     // حالة التحقق الافتراضية
      ]
    );
    
    const user = result.rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'خطأ في الخادم أثناء التسجيل' });
  }
});

// ─── POST /api/auth/login ────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const result = await query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
    }
    const { password_hash, ...safe } = user;
    const token = signToken(user.id);
    res.json({ token, user: safe });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'خطأ في الخادم أثناء تسجيل الدخول' });
  }
});

module.exports = router;