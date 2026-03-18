const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware');
const { hashPassword } = require('../auth');

// Get all users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at').all();
  res.json(users);
});

// Create user
router.post('/users', requireAdmin, async (req, res) => {
  const { username, password, display_name, role = 'user' } = req.body;
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: 'username, password, and display_name required' });
  }
  const hash = await hashPassword(password);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(username.toLowerCase(), hash, display_name, role);
    const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.json(user);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
    throw e;
  }
});

// Reset password
router.put('/users/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const hash = await hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true });
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Create event
router.post('/events', requireAdmin, (req, res) => {
  const { name, description, event_date, lock_time } = req.body;
  if (!name) return res.status(400).json({ error: 'Event name required' });
  const result = db.prepare(
    'INSERT INTO events (name, description, event_date, lock_time, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(name, description, event_date, lock_time, req.user.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.json(event);
});

// Update event
router.put('/events/:id', requireAdmin, (req, res) => {
  const { name, description, event_date, lock_time, is_locked, is_archived } = req.body;
  db.prepare(`UPDATE events SET 
    name = COALESCE(?, name),
    description = COALESCE(?, description),
    event_date = COALESCE(?, event_date),
    lock_time = COALESCE(?, lock_time),
    is_locked = COALESCE(?, is_locked),
    is_archived = COALESCE(?, is_archived),
    updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, description, event_date, lock_time, is_locked, is_archived, req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json(event);
});

// Delete event
router.delete('/events/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Import categories/nominees from JSON or CSV-parsed data
router.post('/events/:id/import', requireAdmin, (req, res) => {
  const { categories } = req.body;
  // categories = [{ name, nominees: [{ name, subtitle }] }]
  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: 'Expected { categories: [...] }' });
  }

  const insertCategory = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)');
  const insertNominee = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)');

  const importAll = db.transaction(() => {
    categories.forEach((cat, catIdx) => {
      const catResult = insertCategory.run(req.params.id, cat.name, catIdx);
      (cat.nominees || []).forEach((nom, nomIdx) => {
        insertNominee.run(catResult.lastInsertRowid, nom.name, nom.subtitle || null, nomIdx);
      });
    });
  });

  importAll();
  res.json({ success: true, imported: categories.length });
});

// Clear and re-import categories for an event
router.post('/events/:id/reimport', requireAdmin, (req, res) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: 'Expected { categories: [...] }' });
  }

  const reimport = db.transaction(() => {
    db.prepare('DELETE FROM categories WHERE event_id = ?').run(req.params.id);
    const insertCategory = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)');
    const insertNominee = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)');
    categories.forEach((cat, catIdx) => {
      const catResult = insertCategory.run(req.params.id, cat.name, catIdx);
      (cat.nominees || []).forEach((nom, nomIdx) => {
        insertNominee.run(catResult.lastInsertRowid, nom.name, nom.subtitle || null, nomIdx);
      });
    });
  });

  reimport();
  res.json({ success: true, imported: categories.length });
});

// Set correct answer for a category
router.put('/categories/:id/answer', requireAdmin, (req, res) => {
  const { nominee_id } = req.body;
  db.prepare('UPDATE categories SET correct_nominee_id = ? WHERE id = ?').run(nominee_id || null, req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(cat);
});

module.exports = router;