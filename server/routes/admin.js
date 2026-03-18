const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireAdminOrMoC, permit } = require('../middleware');
const { hashPassword } = require('../auth');

// ─── Users ────────────────────────────────────────────────────

router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at').all();
  res.json(users);
});

router.post('/users', requireAdmin, permit('username', 'password', 'display_name', 'role'), async (req, res) => {
  const { username, password, display_name, role = 'user' } = req.body;
  if (!username || !password || !display_name) return res.status(400).json({ error: 'username, password, and display_name required' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username must be alphanumeric or underscores' });
  if (password.length < 6 || password.length > 128) return res.status(400).json({ error: 'Password must be 6–128 characters' });
  if (!['user', 'admin', 'moc'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const hash = await hashPassword(password);
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)').run(username.toLowerCase().trim(), hash, display_name.trim(), role);
    res.json(db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
    throw e;
  }
});

router.put('/users/:id/password', requireAdmin, permit('password'), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6 || password.length > 128) return res.status(400).json({ error: 'Password must be 6–128 characters' });
  const hash = await hashPassword(password);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.params.id);
  res.json({ success: true });
});

router.put('/users/:id', requireAdmin, permit('username', 'display_name'), (req, res) => {
  const { username, display_name } = req.body;
  if (!username && !display_name) return res.status(400).json({ error: 'Nothing to update' });
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username must be alphanumeric or underscores' });
  try {
    db.prepare(`UPDATE users SET username = COALESCE(?, username), display_name = COALESCE(?, display_name), updated_at = datetime('now') WHERE id = ?`)
      .run(username ? username.toLowerCase().trim() : null, display_name ? display_name.trim() : null, req.params.id);
    res.json(db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.params.id));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
    throw e;
  }
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Join Requests ─────────────────────────────────────────────

// Get all pending join requests
router.get('/join-requests', requireAdmin, (req, res) => {
  const requests = db.prepare(`
    SELECT jr.id, jr.event_id, jr.user_id, jr.status, jr.requested_at,
           u.display_name, u.username, e.name as event_name
    FROM join_requests jr
    JOIN users u ON u.id = jr.user_id
    JOIN events e ON e.id = jr.event_id
    WHERE jr.status = 'pending'
    ORDER BY jr.requested_at ASC
  `).all();
  res.json(requests);
});

// Approve or deny a request
router.put('/join-requests/:id', requireAdmin, permit('status'), (req, res) => {
  const { status } = req.body;
  if (!['approved', 'denied'].includes(status)) return res.status(400).json({ error: 'Status must be approved or denied' });

  const request = db.prepare('SELECT * FROM join_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  db.transaction(() => {
    db.prepare("UPDATE join_requests SET status = ?, resolved_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    if (status === 'approved') {
      db.prepare('INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?, ?)').run(request.event_id, request.user_id);
    }
  })();

  res.json({ success: true });
});

// ─── Participants ──────────────────────────────────────────────

router.get('/events/:id/participants', requireAdminOrMoC, (req, res) => {
  const participants = db.prepare(`
    SELECT u.id, u.display_name, u.username, ep.joined_at
    FROM event_participants ep JOIN users u ON u.id = ep.user_id
    WHERE ep.event_id = ? ORDER BY u.display_name
  `).all(req.params.id);
  res.json(participants);
});

router.get('/participants/matrix', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, display_name, username FROM users ORDER BY display_name').all();
  const events = db.prepare('SELECT id, name, is_locked, is_archived FROM events ORDER BY created_at DESC').all();
  const participants = db.prepare('SELECT event_id, user_id FROM event_participants').all();
  const matrix = {};
  for (const p of participants) {
    if (!matrix[p.user_id]) matrix[p.user_id] = {};
    matrix[p.user_id][p.event_id] = true;
  }
  res.json({ users, events, matrix });
});

router.post('/events/:id/participants', requireAdmin, permit('user_id'), (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.prepare('INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?, ?)').run(req.params.id, user_id);
  // Clear any pending request
  db.prepare("UPDATE join_requests SET status = 'approved', resolved_at = datetime('now') WHERE event_id = ? AND user_id = ? AND status = 'pending'").run(req.params.id, user_id);
  res.json({ success: true });
});

router.delete('/events/:id/participants/:userId', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ success: true });
});

// ─── Events ────────────────────────────────────────────────────

router.post('/events', requireAdmin, permit('name', 'description', 'event_date', 'lock_time'), (req, res) => {
  const { name, description, event_date, lock_time } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Event name required' });
  const result = db.prepare('INSERT INTO events (name, description, event_date, lock_time, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), description?.trim() || null, event_date || null, lock_time || null, req.user.id);
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/events/:id', requireAdminOrMoC, permit('name', 'description', 'event_date', 'lock_time', 'is_locked', 'is_archived'), (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // MoC can only lock — not unlock, not archive, not edit details
  if (req.user.role === 'moc') {
    const { is_locked } = req.body;
    if (is_locked === undefined) return res.status(403).json({ error: 'MoC can only lock events' });
    if (is_locked === 0 || is_locked === '0') return res.status(403).json({ error: 'MoC cannot unlock events' });
    db.prepare("UPDATE events SET is_locked = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    return res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id));
  }

  const { name, description, event_date, lock_time, is_locked, is_archived } = req.body;
  db.prepare(`UPDATE events SET name = COALESCE(?, name), description = COALESCE(?, description), event_date = COALESCE(?, event_date), lock_time = COALESCE(?, lock_time), is_locked = COALESCE(?, is_locked), is_archived = COALESCE(?, is_archived), updated_at = datetime('now') WHERE id = ?`)
    .run(name || null, description || null, event_date || null, lock_time || null, is_locked ?? null, is_archived ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id));
});

router.delete('/events/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Categories ────────────────────────────────────────────────

router.post('/events/:id/categories', requireAdmin, permit('name'), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Category name required' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM categories WHERE event_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)').run(req.params.id, name.trim(), maxOrder + 1);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  cat.nominees = [];
  res.json(cat);
});

router.put('/categories/:id', requireAdmin, permit('name', 'sort_order'), (req, res) => {
  const { name, sort_order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE categories SET name = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?').run(name.trim(), sort_order ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/categories/:id/nominees', requireAdmin, permit('name', 'subtitle'), (req, res) => {
  const { name, subtitle } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nominee name required' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM nominees WHERE category_id = ?').get(req.params.id).m;
  const result = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)').run(req.params.id, name.trim(), subtitle?.trim() || null, maxOrder + 1);
  res.json(db.prepare('SELECT * FROM nominees WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/nominees/:id', requireAdmin, permit('name', 'subtitle', 'sort_order'), (req, res) => {
  const { name, subtitle, sort_order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE nominees SET name = ?, subtitle = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?').run(name.trim(), subtitle?.trim() || null, sort_order ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM nominees WHERE id = ?').get(req.params.id));
});

router.delete('/nominees/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM nominees WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Set correct answer — admin OR MoC
router.put('/categories/:id/answer', requireAdminOrMoC, permit('nominee_id'), (req, res) => {
  const { nominee_id } = req.body;
  db.prepare('UPDATE categories SET correct_nominee_id = ? WHERE id = ?').run(nominee_id || null, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

// ─── Import ────────────────────────────────────────────────────

router.post('/events/:id/import', requireAdmin, (req, res) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories) || categories.length > 200) return res.status(400).json({ error: 'Expected { categories: [...] } (max 200)' });
  const insertCategory = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)');
  const insertNominee = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    categories.forEach((cat, i) => {
      if (!cat.name) return;
      const c = insertCategory.run(req.params.id, cat.name.trim().slice(0, 200), i);
      (cat.nominees || []).slice(0, 50).forEach((n, j) => {
        if (!n.name) return;
        insertNominee.run(c.lastInsertRowid, n.name.trim().slice(0, 200), n.subtitle?.trim().slice(0, 200) || null, j);
      });
    });
  })();
  res.json({ success: true, imported: categories.length });
});

router.post('/events/:id/reimport', requireAdmin, (req, res) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories) || categories.length > 200) return res.status(400).json({ error: 'Expected { categories: [...] } (max 200)' });
  const insertCategory = db.prepare('INSERT INTO categories (event_id, name, sort_order) VALUES (?, ?, ?)');
  const insertNominee = db.prepare('INSERT INTO nominees (category_id, name, subtitle, sort_order) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    db.prepare('DELETE FROM categories WHERE event_id = ?').run(req.params.id);
    categories.forEach((cat, i) => {
      if (!cat.name) return;
      const c = insertCategory.run(req.params.id, cat.name.trim().slice(0, 200), i);
      (cat.nominees || []).slice(0, 50).forEach((n, j) => {
        if (!n.name) return;
        insertNominee.run(c.lastInsertRowid, n.name.trim().slice(0, 200), n.subtitle?.trim().slice(0, 200) || null, j);
      });
    });
  })();
  res.json({ success: true, imported: categories.length });
});

module.exports = router;
