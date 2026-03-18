const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// Save or update a pick
router.post('/', requireAuth, (req, res) => {
  const { event_id, category_id, nominee_id } = req.body;
  if (!event_id || !category_id || !nominee_id) {
    return res.status(400).json({ error: 'event_id, category_id, nominee_id required' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.is_locked) return res.status(403).json({ error: 'Event is locked' });

  // Auto-lock check: if lock_time has passed, lock the event
  if (event.lock_time && new Date(event.lock_time) <= new Date()) {
    db.prepare('UPDATE events SET is_locked = 1 WHERE id = ?').run(event_id);
    return res.status(403).json({ error: 'Event has been automatically locked' });
  }

  const existing = db.prepare(
    'SELECT id FROM picks WHERE user_id = ? AND category_id = ?'
  ).get(req.user.id, category_id);

  if (existing) {
    db.prepare(
      "UPDATE picks SET nominee_id = ?, updated_at = datetime('now') WHERE user_id = ? AND category_id = ?"
    ).run(nominee_id, req.user.id, category_id);
  } else {
    db.prepare(
      'INSERT INTO picks (user_id, event_id, category_id, nominee_id) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, event_id, category_id, nominee_id);
  }

  res.json({ success: true });
});

// Delete a pick
router.delete('/:category_id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM picks WHERE user_id = ? AND category_id = ?').run(
    req.user.id, req.params.category_id
  );
  res.json({ success: true });
});

module.exports = router;