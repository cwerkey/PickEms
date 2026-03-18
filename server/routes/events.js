const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// Get all events (active + archived)
router.get('/', requireAuth, (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
  res.json(events);
});

// Get single event with categories and nominees
router.get('/:id', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const categories = db.prepare(
    'SELECT * FROM categories WHERE event_id = ? ORDER BY sort_order, id'
  ).all(req.params.id);

  for (const cat of categories) {
    cat.nominees = db.prepare(
      'SELECT * FROM nominees WHERE category_id = ? ORDER BY sort_order, id'
    ).all(cat.id);
  }

  event.categories = categories;
  res.json(event);
});

// Get leaderboard for an event
router.get('/:id/leaderboard', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Count correct picks per user
  const scores = db.prepare(`
    SELECT 
      u.id,
      u.display_name,
      COUNT(CASE WHEN p.nominee_id = c.correct_nominee_id AND c.correct_nominee_id IS NOT NULL THEN 1 END) as correct,
      COUNT(p.id) as total_picks,
      COUNT(CASE WHEN c.correct_nominee_id IS NOT NULL THEN 1 END) as answered_categories
    FROM users u
    LEFT JOIN picks p ON p.user_id = u.id AND p.event_id = ?
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.event_id = ?
    GROUP BY u.id
    ORDER BY correct DESC, total_picks DESC
  `).all(req.params.id, req.params.id);

  res.json(scores);
});

// Get picks for the current user in an event
router.get('/:id/my-picks', requireAuth, (req, res) => {
  const picks = db.prepare(`
    SELECT p.*, n.name as nominee_name, c.name as category_name, c.correct_nominee_id
    FROM picks p
    JOIN nominees n ON n.id = p.nominee_id
    JOIN categories c ON c.id = p.category_id
    WHERE p.user_id = ? AND p.event_id = ?
  `).all(req.user.id, req.params.id);
  res.json(picks);
});

// Get all users' picks (only after event is locked)
router.get('/:id/all-picks', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (!event.is_locked && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Picks are hidden until event is locked' });
  }

  const picks = db.prepare(`
    SELECT p.*, u.display_name, n.name as nominee_name, c.name as category_name, c.correct_nominee_id
    FROM picks p
    JOIN users u ON u.id = p.user_id
    JOIN nominees n ON n.id = p.nominee_id
    JOIN categories c ON c.id = p.category_id
    WHERE p.event_id = ?
    ORDER BY u.display_name, c.sort_order
  `).all(req.params.id);

  res.json(picks);
});

module.exports = router;