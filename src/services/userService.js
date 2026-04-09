const bcrypt = require('bcryptjs');
const { getPool } = require('../db');

const BCRYPT_ROUNDS = 12;

async function findUserById(id) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, password_hash AS passwordHash FROM users WHERE id = :id`,
    { id }
  );
  return rows[0] || null;
}

async function createUser(id, password) {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    await pool.execute(
      `INSERT INTO users (id, password_hash) VALUES (:id, :passwordHash)`,
      { id, passwordHash }
    );
    return { ok: true };
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return { ok: false, error: 'already_exists' };
    throw e;
  }
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { findUserById, createUser, verifyPassword };
