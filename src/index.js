const app = require('./app');
const config = require('./config');
const { waitForConnection } = require('./db');
const { ensureBucket } = require('./services/s3');

async function ensureBucketWithRetry() {
  const retries = parseInt(process.env.MINIO_WAIT_RETRIES || '30', 10);
  const delayMs = parseInt(process.env.MINIO_WAIT_MS || '2000', 10);
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      await ensureBucket();
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function main() {
  await waitForConnection();
  await ensureBucketWithRetry();
  app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
