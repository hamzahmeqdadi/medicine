const jwt = require('jsonwebtoken');
const { query } = require('../db');

// ─── Require valid JWT ───────────────────────
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح — الرجاء تسجيل الدخول' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length) return res.status(401).json({ error: 'المستخدم غير موجود' });
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'الجلسة منتهية — الرجاء تسجيل الدخول مجدداً' });
  }
};

// ─── Optional auth (for guest users) ────────
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length) req.user = result.rows[0];
  } catch {}
  next();
};

// ─── Admin only ──────────────────────────────
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مسموح — صلاحيات المسؤول مطلوبة' });
  }
  next();
};

module.exports = { requireAuth, optionalAuth, requireAdmin };