const sessionService = require('../services/sessionService');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  const decoded = sessionService.verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const session = await sessionService.getSessionIfActive(decoded.sessionId);
  if (!session || session.userId !== decoded.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = session.userId;
  req.sessionId = session.id;
  next();
}

module.exports = { requireAuth };
