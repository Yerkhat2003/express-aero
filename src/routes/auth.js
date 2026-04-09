const express = require('express');
const { normalizeUserId } = require('../utils/validation');
const userService = require('../services/userService');
const sessionService = require('../services/sessionService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const AUTH_FAILED = { error: 'Invalid id or password' };

function postOnly(pathHint) {
  return (_req, res) => {
    res.set('Allow', 'POST');
    res.status(405).json({
      error: 'Method not allowed',
      hint: `Send POST ${pathHint} with Content-Type: application/json`,
    });
  };
}

function parseBodyIdPassword(req) {
  const { id, password } = req.body || {};
  if (password == null || String(password).length === 0) {
    return { error: 'password is required' };
  }
  const norm = normalizeUserId(id);
  if (!norm.ok) return { error: norm.error };
  return { id: norm.id, password: String(password) };
}

router.get('/signup', postOnly('/signup'));
router.get('/signin', postOnly('/signin'));
router.get('/signin/new_token', postOnly('/signin/new_token'));

router.post('/signup', async (req, res) => {
  const parsed = parseBodyIdPassword(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { id, password } = parsed;
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  const created = await userService.createUser(id, password);
  if (!created.ok) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const tokens = await sessionService.createSession(id);
  return res.status(201).json({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
});

router.post('/signin', async (req, res) => {
  const parsed = parseBodyIdPassword(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { id, password } = parsed;
  const user = await userService.findUserById(id);
  if (!user) return res.status(401).json(AUTH_FAILED);
  const ok = await userService.verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json(AUTH_FAILED);
  const tokens = await sessionService.createSession(id);
  return res.json({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
});

router.post('/signin/new_token', async (req, res) => {
  const refreshToken = req.body && req.body.refresh_token;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refresh_token is required' });
  }
  const rotated = await sessionService.rotateRefreshToken(refreshToken);
  if (!rotated) return res.status(401).json({ error: 'Invalid or expired refresh token' });
  return res.json({
    access_token: rotated.accessToken,
    refresh_token: rotated.refreshToken,
  });
});

router.get('/info', requireAuth, (req, res) => {
  res.json({ id: req.userId });
});

router.get('/logout', requireAuth, async (req, res) => {
  await sessionService.revokeSession(req.sessionId);
  res.json({ ok: true });
});

module.exports = router;
