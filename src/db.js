const mysql = require('mysql2/promise');
const config = require('./config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }
  return pool;
}

async function waitForConnection() {
  const { waitRetries, waitMs } = config.db;
  let lastErr;
  for (let i = 0; i < waitRetries; i += 1) {
    try {
      const p = getPool();
      const conn = await p.getConnection();
      conn.release();
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

module.exports = { getPool, waitForConnection };
