const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');
const config = require('../config');

const endpoint = `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endpoint}:${config.minio.port}`;

const client = new S3Client({
  region: config.minio.region,
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
});

const bucket = config.minio.bucket;

async function ensureBucket() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e) {
    const code = e.name || e.Code;
    const status = e.$metadata?.httpStatusCode;
    if (code === 'NotFound' || status === 404) {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    throw e;
  }
}

async function putObject(key, body, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
}

async function getObjectStream(key) {
  const out = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  return { stream: out.Body, contentType: out.ContentType };
}

async function deleteObject(key) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

module.exports = {
  ensureBucket,
  putObject,
  getObjectStream,
  deleteObject,
  bucket,
};
