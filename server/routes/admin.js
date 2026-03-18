const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, permit } = require('../middleware');
const { hashPassword } = require('../auth');

// Get all users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at').all();
  res.json(users);
});

// Create user
router.post('/users',
  requireAdmin,
  permit('username', 'password', 'display_name', 'role'),
  async (req, res) => {
    const { username, password, display_name, role = 'user' } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'username, password, and display_name required' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be alphanumeric characters or underscores only' });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 6–128 characters' });
    }
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hash = await hashPassword(password);
    try {
      const result = db.prepare(
        'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
      ).run(username.toLowerCase().trim(), hash, display_name.trim(), role);
      const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
      res.json(user);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
      throw e;
    }
  }
);

// Reset password
router.put('/users/:id/password',
  requireAdmin,
  permit('password'),
  async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 6–128 characters' });
    }
    const hash = await hashPassword(password);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(hash, req.params.id);
    res.json({ success: true });
  }
);

// Update username / display name
router.put('/users/:id',
  requireAdmin,
  permit('username', 'display_name'),
  (req, res) => {
    const { username, display_name } = req.body;
    if (!username && !display_name) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be alphanumeric characters or underscores only' });
    }
    try {
      db.prepare(`UPDATE users SET
        username = COALESCE(?, username),
        display_name = COALESCE(?, display_name),
        updated_at = datetime('now')
        WHERE id = ?`
      ).run(username ? username.toLowerCase().trim() : null, display_name ? display_name.trim() : null, req.params.id);
      const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.params.id);
      res.json(user);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
      throw e;
    }
  }
);

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Create event
router.post('/events',
  requireAdmin,
  permit('name', 'description', 'event_date', 'lock_time'),
  (req, res) => {
    const { name, description, event_date, lock_time } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Event name required' });
    }
    const result = db.prepare(
      'INSERT INTO events (name, description, event_date, lock_time, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(name.trim(), description?.trim() || null, event_date || null, lock_time || null, req.user.id);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    res.json(event);
  }
);

// Update event
router.put('/events/:id',
  requireAdmin,
  permit('name', 'description', 'event_date', 'lock_time', 'is_locked', 'is_archived'),
  (req, res) => {
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
    ).run(name || null, description || null, event_date || null, lock_time || null, is_locked ?? null, is_archived ?? null, req.params.id);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json(event);
  }
);

// Delete event
router.delete('/events/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Import categories
router.post('/events/:id/import', requireAdmin, (req, res) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories) || categories.length > 200) {
    return res.status(400).json({ error: 'Expected { categories: [...] } (max 200)' });
  }
  const insertCategory = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)');
  const insertNominee = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)');
  const importAll = db.transaction(() => {
    categories.forEach((cat, catIdx) => {
      if (!cat.name || typeof cat.name !== 'string') return;
      const catResult = insertCategory.run(req.params.id, cat.name.trim().slice(0, 200), catIdx);
      (cat.nominees || []).slice(0, 50).forEach((nom, nomIdx) => {
        if (!nom.name || typeof nom.name !== 'string') return;
        insertNominee.run(catResult.lastInsertRowid, nom.name.trim().slice(0, 200), nom.subtitle?.trim().slice(0, 200) || null, nomIdx);
      });
    });
  });
  importAll();
  res.json({ success: true, imported: categories.length });
});

// Clear and reimport
router.post('/events/:id/reimport', requireAdmin, (req, res) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories) || categories.length > 200) {
    return res.status(400).json({ error: 'Expected { categories: [...] } (max 200)' });
  }
  const reimport = db.transaction(() => {
    db.prepare('DELETE FROM categories WHERE event_id = ?').run(req.params.id);
    const insertCategory = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)');
    const insertNominee = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)');
    categories.forEach((cat, catIdx) => {
      if (!cat.name || typeof cat.name !== 'string') return;
      const catResult = insertCategory.run(req.params.id, cat.name.trim().slice(0, 200), catIdx);
      (cat.nominees || []).slice(0, 50).forEach((nom, nomIdx) => {
        if (!nom.name || typeof nom.name !== 'string') return;
        insertNominee.run(catResult.lastInsertRowid, nom.name.trim().slice(0, 200), nom.subtitle?.trim().slice(0, 200) || null, nomIdx);
      });
    });
  });
  reimport();
  res.json({ success: true, imported: categories.length });
});

// Set correct answer — also returns recent activity for notification
router.put('/categories/:id/answer',
  requireAdmin,
  permit('nominee_id'),
  (req, res) => {
    const { nominee_id } = req.body;
    db.prepare('UPDATE categories SET correct_nominee_id = ? WHERE id = ?')
      .run(nominee_id || null, req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(cat);
  }
);

module.exports = router;
