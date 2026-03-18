const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateToken, hashPassword, comparePassword } = require('../auth');
const { requireAuth } = require('../middleware');

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
  });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Update own profile / password
router.put('/me', requireAuth, async (req, res) => {
  const { display_name, username, current_password, new_password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Current password required' });
    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = new_password ? await hashPassword(new_password) : user.password_hash;

  try {
    db.prepare(`UPDATE users SET
      display_name = COALESCE(?, display_name),
      username = COALESCE(?, username),
      password_hash = ?,
      updated_at = datetime('now')
      WHERE id = ?`
    ).run(display_name || null, username ? username.toLowerCase() : null, newHash, req.user.id);

    const updated = db.prepare(
      'SELECT id, username, display_name, role FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json(updated);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
    throw e;
  }
});

// Setup first admin
router.post('/setup', async (req, res) => {
  const { username, password, display_name, setup_key } = req.body;
  if (setup_key !== process.env.ADMIN_SETUP_KEY) {
    return res.status(403).json({ error: 'Invalid setup key' });
  }
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) return res.status(400).json({ error: 'Admin already exists' });

  const hash = await hashPassword(password);
  const result = db.prepare(
    "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, 'admin')"
  ).run(username.toLowerCase(), hash, display_name);

  const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);
  res.json({ token, user });
});

module.exports = router;
