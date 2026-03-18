const { verifyToken } = require('./auth');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// Strips unexpected fields from req.body
function permit(...allowed) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      Object.keys(req.body).forEach(key => {
        if (!allowed.includes(key)) delete req.body[key];
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireAdmin, permit };
