const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
  next();
};

module.exports = { authenticateToken, requireRole };
