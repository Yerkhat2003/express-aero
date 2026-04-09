require('dotenv').config();

function required(name, fallback) {
  const v = process.env[name];
  if (v != null && v !== '') return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env: ${name}`);
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: required('JWT_SECRET', 'dev-jwt-secret-change-me'),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: required('DB_USER', 'api'),
    password: required('DB_PASSWORD', 'apipass'),
    database: required('DB_NAME', 'erp_aero'),
    waitRetries: parseInt(process.env.DB_WAIT_RETRIES || '30', 10),
    waitMs: parseInt(process.env.DB_WAIT_MS || '2000', 10),
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: required('MINIO_ACCESS_KEY', 'minio'),
    secretKey: required('MINIO_SECRET_KEY', 'minio12345'),
    bucket: process.env.MINIO_BUCKET || 'erp-aero-files',
    useSSL: process.env.MINIO_USE_SSL === 'true',
    region: process.env.MINIO_REGION || 'us-east-1',
  },
  refreshExpiresDays: parseInt(process.env.REFRESH_EXPIRES_DAYS || '7', 10),
  accessExpiresSeconds: parseInt(process.env.ACCESS_EXPIRES_SECONDS || '600', 10),
  maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES || String(50 * 1024 * 1024), 10),
};
