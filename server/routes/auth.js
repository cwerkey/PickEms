const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateToken, hashPassword, comparePassword } = require('../auth');
const { requireAuth, permit } = require('../middleware');

// Login — always runs bcrypt to prevent timing attacks
router.post('/login',
  permit('username', 'password'),
  async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());

    // Always run bcrypt even if user not found — prevents user enumeration via timing
    const dummyHash = '$2a$12$dummyhashfortimingprotectiononly000000000000000000000';
    const valid = user
      ? await comparePassword(password, user.password_hash)
      : await comparePassword(password, dummyHash).then(() => false);

    if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
    });
  }
);

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update own profile / password
router.put('/me',
  requireAuth,
  permit('display_name', 'username', 'current_password', 'new_password'),
  async (req, res) => {
    const { display_name, username, current_password, new_password } = req.body;

    // Validate lengths
    if (display_name && (typeof display_name !== 'string' || display_name.trim().length < 1 || display_name.length > 50)) {
      return res.status(400).json({ error: 'Display name must be 1–50 characters' });
    }
    if (username && (typeof username !== 'string' || username.trim().length < 2 || username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(username))) {
      return res.status(400).json({ error: 'Username must be 2–30 alphanumeric characters or underscores' });
    }
    if (new_password && (typeof new_password !== 'string' || new_password.length < 6 || new_password.length > 128)) {
      return res.status(400).json({ error: 'Password must be 6–128 characters' });
    }

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
      ).run(
        display_name ? display_name.trim() : null,
        username ? username.toLowerCase().trim() : null,
        newHash,
        req.user.id
      );
      const updated = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.user.id);
      res.json(updated);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken' });
      throw e;
    }
  }
);

// Setup first admin
router.post('/setup',
  permit('username', 'password', 'display_name', 'setup_key'),
  async (req, res) => {
    const { username, password, display_name, setup_key } = req.body;
    if (setup_key !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }
    const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
    if (existing) return res.status(400).json({ error: 'Admin already exists' });

    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be alphanumeric' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = await hashPassword(password);
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, 'admin')"
    ).run(username.toLowerCase().trim(), hash, display_name.trim());

    const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user);
    res.json({ token, user });
  }
);

module.exports = router;
