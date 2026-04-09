const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getPool } = require('../db');
const { sha256Hex, randomRefreshToken } = require('../utils/tokens');

function refreshExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + config.refreshExpiresDays);
  return d;
}

function signAccessToken(userId, sessionId, jti) {
  return jwt.sign(
    { sub: userId, sid: sessionId, jti, typ: 'access' },
    config.jwtSecret,
    { expiresIn: `${config.accessExpiresSeconds}s` }
  );
}

async function createSession(userId) {
  const pool = getPool();
  const sessionId = crypto.randomUUID();
  const refreshToken = randomRefreshToken();
  const refreshHash = sha256Hex(refreshToken);
  const expiresAt = refreshExpiresAt();

  await pool.execute(
    `INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
     VALUES (:id, :userId, :hash, :expiresAt)`,
    { id: sessionId, userId, hash: refreshHash, expiresAt }
  );

  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(userId, sessionId, jti);
  return { sessionId, accessToken, refreshToken };
}

async function getSessionIfActive(sessionId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, revoked_at AS revokedAt
     FROM sessions WHERE id = :id`,
    { id: sessionId }
  );
  const row = rows[0];
  if (!row || row.revokedAt) return null;
  return { id: row.id, userId: row.userId };
}

async function revokeSession(sessionId) {
  const pool = getPool();
  await pool.execute(
    `UPDATE sessions SET revoked_at = NOW() WHERE id = :id AND revoked_at IS NULL`,
    { id: sessionId }
  );
}

async function rotateRefreshToken(plainRefreshToken) {
  const pool = getPool();
  const hash = sha256Hex(plainRefreshToken);
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, expires_at AS expiresAt, revoked_at AS revokedAt
     FROM sessions WHERE refresh_token_hash = :hash`,
    { hash }
  );
  const row = rows[0];
  if (!row || row.revokedAt) return null;
  const exp = new Date(row.expiresAt);
  if (exp.getTime() < Date.now()) return null;

  const newRefresh = randomRefreshToken();
  const newHash = sha256Hex(newRefresh);
  const newExpires = refreshExpiresAt();

  const [result] = await pool.execute(
    `UPDATE sessions
     SET refresh_token_hash = :newHash, expires_at = :newExpires
     WHERE id = :id AND refresh_token_hash = :oldHash AND revoked_at IS NULL`,
    { newHash, newExpires, id: row.id, oldHash: hash }
  );

  if (result.affectedRows !== 1) return null;

  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(row.userId, row.id, jti);
  return { accessToken, refreshToken: newRefresh };
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.typ !== 'access' || !payload.sub || !payload.sid) return null;
    return { userId: payload.sub, sessionId: payload.sid, jti: payload.jti };
  } catch {
    return null;
  }
}

module.exports = {
  createSession,
  getSessionIfActive,
  revokeSession,
  rotateRefreshToken,
  verifyAccessToken,
};
