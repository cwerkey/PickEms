const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { generateToken, verifyToken, hashPassword, comparePassword };