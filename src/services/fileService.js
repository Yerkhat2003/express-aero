const crypto = require('crypto');
const path = require('path');
const { getPool } = require('../db');
const s3 = require('./s3');

function extensionFromName(filename) {
  const ext = path.extname(filename || '').replace(/^\./, '');
  return ext || 'bin';
}

async function createUploadedFile(userId, buffer, originalName, mimeType) {
  const id = crypto.randomUUID();
  const extension = extensionFromName(originalName);
  const storageKey = `${userId}/${id}`;
  const sizeBytes = buffer.length;
  await s3.putObject(storageKey, buffer, mimeType || 'application/octet-stream');
  const pool = getPool();
  const uploadedAt = new Date();
  await pool.execute(
    `INSERT INTO files (id, user_id, original_name, extension, mime_type, size_bytes, uploaded_at, storage_key)
     VALUES (:id, :userId, :originalName, :extension, :mimeType, :sizeBytes, :uploadedAt, :storageKey)`,
    {
      id,
      userId,
      originalName: originalName || 'unnamed',
      extension,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes,
      uploadedAt,
      storageKey,
    }
  );
  return getFileByIdForUser(id, userId);
}

async function getFileByIdForUser(fileId, userId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, original_name AS originalName, extension, mime_type AS mimeType,
            size_bytes AS sizeBytes, uploaded_at AS uploadedAt, storage_key AS storageKey
     FROM files WHERE id = :id AND user_id = :userId`,
    { id: fileId, userId }
  );
  return rows[0] || null;
}

async function listFilesForUser(userId, page, listSize) {
  const pool = getPool();
  const offset = (page - 1) * listSize;
  const [rows] = await pool.execute(
    `SELECT id, original_name AS originalName, extension, mime_type AS mimeType,
            size_bytes AS sizeBytes, uploaded_at AS uploadedAt
     FROM files WHERE user_id = ?
     ORDER BY uploaded_at DESC
     LIMIT ? OFFSET ?`,
    [userId, listSize, offset]
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM files WHERE user_id = ?`,
    [userId]
  );
  return { items: rows, total: Number(total) };
}

async function deleteFileForUser(fileId, userId) {
  const row = await getFileByIdForUser(fileId, userId);
  if (!row) return { ok: false };
  await s3.deleteObject(row.storageKey);
  const pool = getPool();
  await pool.execute(`DELETE FROM files WHERE id = :id AND user_id = :userId`, {
    id: fileId,
    userId,
  });
  return { ok: true };
}

async function updateFileForUser(fileId, userId, buffer, meta) {
  const row = await getFileByIdForUser(fileId, userId);
  if (!row) return { ok: false, file: null };
  const oldKey = row.storageKey;
  const newKey = `${userId}/${crypto.randomUUID()}`;
  await s3.putObject(newKey, buffer, meta.mimeType);
  const pool = getPool();
  const uploadedAt = new Date();
  await pool.execute(
    `UPDATE files SET
       original_name = :originalName,
       extension = :extension,
       mime_type = :mimeType,
       size_bytes = :sizeBytes,
       uploaded_at = :uploadedAt,
       storage_key = :storageKey
     WHERE id = :id AND user_id = :userId`,
    {
      originalName: meta.originalName,
      extension: meta.extension,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      uploadedAt,
      storageKey: newKey,
      id: fileId,
      userId,
    }
  );
  try {
    await s3.deleteObject(oldKey);
  } catch (e) {
    console.warn('Failed to delete old object', oldKey, e.message);
  }
  const file = await getFileByIdForUser(fileId, userId);
  return { ok: true, file };
}

module.exports = {
  extensionFromName,
  createUploadedFile,
  getFileByIdForUser,
  listFilesForUser,
  deleteFileForUser,
  updateFileForUser,
};
