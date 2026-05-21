const express = require('express');
const { body, validationResult, query: vQuery } = require('express-validator');
const { query } = require('../db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/articles ───────────────────────
router.get('/', async (req, res) => {
  const { category, search, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conditions = ['a.is_published = TRUE'];

  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  try {
    const result = await query(
      `SELECT a.id, a.title, a.slug, a.summary, a.cover_url,
              a.views, a.read_time_min, a.published_at, a.tags,
              c.name_ar AS category_name, c.slug AS category_slug, c.icon AS category_icon,
              u.name AS author_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.author_id = u.id
       ${where}
       ORDER BY a.published_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM articles a LEFT JOIN categories c ON a.category_id = c.id ${where}`,
      params.slice(0, -2)
    );

    res.json({
      articles: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── GET /api/articles/:slug ─────────────────
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, c.name_ar AS category_name, c.slug AS category_slug,
              c.icon AS category_icon, u.name AS author_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.slug = $1 AND a.is_published = TRUE`,
      [req.params.slug]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'المقال غير موجود' });

    // Increment views
    await query('UPDATE articles SET views = views + 1 WHERE slug = $1', [req.params.slug]);

    // Check if bookmarked
    let bookmarked = false;
    if (req.user) {
      const bm = await query(
        'SELECT id FROM bookmarks WHERE user_id = $1 AND article_id = $2',
        [req.user.id, result.rows[0].id]
      );
      bookmarked = bm.rows.length > 0;
    }

    res.json({ article: { ...result.rows[0], bookmarked } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/articles (admin) ──────────────
router.post('/', requireAuth, requireAdmin, [
  body('title').trim().notEmpty().isLength({ max: 300 }),
  body('slug').trim().notEmpty(),
  body('content').notEmpty(),
  body('category_id').isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, slug, summary, content, category_id, cover_url, read_time_min, tags, is_published } = req.body;
  try {
    const result = await query(
      `INSERT INTO articles
         (title, slug, summary, content, category_id, author_id, cover_url, read_time_min, tags, is_published, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $10 THEN NOW() ELSE NULL END)
       RETURNING *`,
      [title, slug, summary, content, category_id, req.user.id, cover_url, read_time_min || 3, tags || [], !!is_published]
    );
    res.status(201).json({ article: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'الرابط مستخدم بالفعل' });
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── PATCH /api/articles/:id (admin) ─────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, summary, content, cover_url, read_time_min, tags, is_published } = req.body;
  try {
    const result = await query(
      `UPDATE articles SET
         title         = COALESCE($1, title),
         summary       = COALESCE($2, summary),
         content       = COALESCE($3, content),
         cover_url     = COALESCE($4, cover_url),
         read_time_min = COALESCE($5, read_time_min),
         tags          = COALESCE($6, tags),
         is_published  = COALESCE($7, is_published),
         published_at  = CASE WHEN $7 = TRUE AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = $8 RETURNING *`,
      [title, summary, content, cover_url, read_time_min, tags, is_published, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'المقال غير موجود' });
    res.json({ article: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── DELETE /api/articles/:id (admin) ────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM articles WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'المقال غير موجود' });
    res.json({ message: 'تم حذف المقال' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── GET /api/articles/bookmarks/mine ────────
router.get('/bookmarks/mine', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.title, a.slug, a.summary, a.cover_url, a.read_time_min,
              c.name_ar AS category_name, c.icon AS category_icon
       FROM bookmarks b
       JOIN articles a ON b.article_id = a.id
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ articles: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/articles/:id/bookmark ─────────
router.post('/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const existing = await query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND article_id = $2',
      [req.user.id, req.params.id]
    );
    if (existing.rows.length) {
      await query('DELETE FROM bookmarks WHERE user_id = $1 AND article_id = $2', [req.user.id, req.params.id]);
      return res.json({ bookmarked: false });
    }
    await query('INSERT INTO bookmarks (user_id, article_id) VALUES ($1,$2)', [req.user.id, req.params.id]);
    res.json({ bookmarked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;