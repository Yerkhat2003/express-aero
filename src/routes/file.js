const express = require('express');
const multer = require('multer');
const path = require('path');
const { pipeline } = require('stream/promises');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const fileService = require('../services/fileService');
const s3 = require('../services/s3');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
});

function parsePagination(query) {
  let listSize = parseInt(query.list_size, 10);
  if (Number.isNaN(listSize) || listSize < 1) listSize = 10;
  if (listSize > 100) listSize = 100;
  let page = parseInt(query.page, 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  return { page, listSize };
}

function serializeFile(row) {
  if (!row) return null;
  return {
    id: row.id,
    original_name: row.originalName,
    extension: row.extension,
    mime_type: row.mimeType,
    size_bytes: row.sizeBytes,
    uploaded_at: row.uploadedAt,
  };
}

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'file field is required (multipart/form-data)' });
  }
  const originalName = req.file.originalname || 'upload';
  const mimeType = req.file.mimetype || 'application/octet-stream';
  const row = await fileService.createUploadedFile(
    req.userId,
    req.file.buffer,
    originalName,
    mimeType
  );
  return res.status(201).json({ file: serializeFile(row) });
});

router.get('/list', requireAuth, async (req, res) => {
  const { page, listSize } = parsePagination(req.query);
  const { items, total } = await fileService.listFilesForUser(req.userId, page, listSize);
  const totalPages = Math.max(1, Math.ceil(total / listSize));
  res.json({
    page,
    list_size: listSize,
    total,
    total_pages: totalPages,
    files: items.map(serializeFile),
  });
});

router.delete('/delete/:id', requireAuth, async (req, res) => {
  const result = await fileService.deleteFileForUser(req.params.id, req.userId);
  if (!result.ok) return res.status(404).json({ error: 'File not found' });
  res.json({ ok: true });
});

router.get('/download/:id', requireAuth, async (req, res) => {
  const row = await fileService.getFileByIdForUser(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'File not found' });
  const { stream, contentType } = await s3.getObjectStream(row.storageKey);
  res.setHeader('Content-Type', contentType || row.mimeType || 'application/octet-stream');
  const safeName = path.basename(row.originalName || 'download');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);
  await pipeline(stream, res);
});

router.put('/update/:id', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'file field is required (multipart/form-data)' });
  }
  const originalName = req.file.originalname || 'upload';
  const mimeType = req.file.mimetype || 'application/octet-stream';
  const extension = fileService.extensionFromName(originalName);
  const result = await fileService.updateFileForUser(req.params.id, req.userId, req.file.buffer, {
    originalName,
    mimeType,
    extension,
    sizeBytes: req.file.buffer.length,
  });
  if (!result.ok) return res.status(404).json({ error: 'File not found' });
  res.json({ file: serializeFile(result.file) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const row = await fileService.getFileByIdForUser(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'File not found' });
  res.json({ file: serializeFile(row) });
});

module.exports = router;
