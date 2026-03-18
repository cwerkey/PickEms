const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// Get all events
router.get('/', requireAuth, (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
  res.json(events);
});

// All-time stats — before /:id
router.get('/stats/alltime', requireAuth, (req, res) => {
  const events = db.prepare('SELECT id, name, event_date FROM events ORDER BY event_date DESC').all();
  const users = db.prepare('SELECT id, display_name FROM users ORDER BY display_name').all();
  const eventScores = db.prepare(`
    SELECT p.user_id, p.event_id,
      COUNT(CASE WHEN p.nominee_id = c.correct_nominee_id AND c.correct_nominee_id IS NOT NULL THEN 1 END) as correct
    FROM picks p JOIN categories c ON c.id = p.category_id
    GROUP BY p.user_id, p.event_id
  `).all();
  const eventWinners = {};
  for (const event of events) {
    const winner = db.prepare(`
      SELECT p.user_id,
        COUNT(CASE WHEN p.nominee_id = c.correct_nominee_id AND c.correct_nominee_id IS NOT NULL THEN 1 END) as correct
      FROM picks p JOIN categories c ON c.id = p.category_id
      WHERE p.event_id = ? GROUP BY p.user_id ORDER BY correct DESC LIMIT 1
    `).get(event.id);
    if (winner && winner.correct > 0) eventWinners[event.id] = winner.user_id;
  }
  res.json({ events, users, eventScores, eventWinners });
});

// Get single event with categories and nominees
router.get('/:id', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const categories = db.prepare('SELECT * FROM categories WHERE event_id = ? ORDER BY sort_order, id').all(req.params.id);
  for (const cat of categories) {
    cat.nominees = db.prepare('SELECT * FROM nominees WHERE category_id = ? ORDER BY sort_order, id').all(cat.id);
  }
  event.categories = categories;
  res.json(event);
});

// Leaderboard
router.get('/:id/leaderboard', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE event_id = ?').get(req.params.id).count;

  const scores = db.prepare(`
    SELECT u.id, u.display_name,
      COUNT(p.id) as total_picks,
      COUNT(CASE WHEN c.correct_nominee_id IS NOT NULL THEN 1 END) as answered_categories,
      COUNT(CASE WHEN p.nominee_id = c.correct_nominee_id AND c.correct_nominee_id IS NOT NULL THEN 1 END) as correct
    FROM users u
    LEFT JOIN picks p ON p.user_id = u.id AND p.event_id = ?
    LEFT JOIN categories c ON c.id = p.category_id
    GROUP BY u.id
    ORDER BY correct DESC, total_picks DESC
  `).all(req.params.id);

  // Most recently answered category with winner activity
  const recentAnswer = db.prepare(`
    SELECT c.id, c.name, c.correct_nominee_id, n.name as winner_name
    FROM categories c
    JOIN nominees n ON n.id = c.correct_nominee_id
    WHERE c.event_id = ? AND c.correct_nominee_id IS NOT NULL
    ORDER BY c.rowid DESC LIMIT 1
  `).get(req.params.id);

  let recentActivity = null;
  if (recentAnswer) {
    const picksForCategory = db.prepare(`
      SELECT p.user_id, p.nominee_id, u.display_name, n.name as picked_name
      FROM picks p
      JOIN users u ON u.id = p.user_id
      JOIN nominees n ON n.id = p.nominee_id
      WHERE p.category_id = ?
    `).all(recentAnswer.id);

    recentActivity = {
      category_name: recentAnswer.name,
      winner_name: recentAnswer.winner_name,
      correct_nominee_id: recentAnswer.correct_nominee_id,
      picks: picksForCategory.map(p => ({
        display_name: p.display_name,
        picked_name: p.picked_name,
        correct: p.nominee_id === recentAnswer.correct_nominee_id,
      })),
    };
  }

  res.json({ scores, totalCategories, isLocked: event.is_locked, recentActivity });
});

// My picks
router.get('/:id/my-picks', requireAuth, (req, res) => {
  const picks = db.prepare(`
    SELECT p.*, n.name as nominee_name, c.name as category_name, c.correct_nominee_id
    FROM picks p JOIN nominees n ON n.id = p.nominee_id JOIN categories c ON c.id = p.category_id
    WHERE p.user_id = ? AND p.event_id = ?
  `).all(req.user.id, req.params.id);
  res.json(picks);
});

// A specific user's picks — only allowed after lock
router.get('/:id/user-picks/:userId', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.is_locked && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Picks are hidden until event is locked' });
  }
  const targetUser = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(req.params.userId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const picks = db.prepare(`
    SELECT p.category_id, p.nominee_id, n.name as nominee_name,
           c.name as category_name, c.correct_nominee_id, c.sort_order
    FROM picks p
    JOIN nominees n ON n.id = p.nominee_id
    JOIN categories c ON c.id = p.category_id
    WHERE p.user_id = ? AND p.event_id = ?
    ORDER BY c.sort_order, c.id
  `).all(req.params.userId, req.params.id);

  res.json({ user: targetUser, picks });
});

// All picks (legacy, kept for admin use)
router.get('/:id/all-picks', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.is_locked && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Picks are hidden until event is locked' });
  }
  const picks = db.prepare(`
    SELECT p.*, u.display_name, n.name as nominee_name, c.name as category_name, c.correct_nominee_id
    FROM picks p JOIN users u ON u.id = p.user_id JOIN nominees n ON n.id = p.nominee_id JOIN categories c ON c.id = p.category_id
    WHERE p.event_id = ? ORDER BY u.display_name, c.sort_order
  `).all(req.params.id);
  res.json(picks);
});

module.exports = router;
