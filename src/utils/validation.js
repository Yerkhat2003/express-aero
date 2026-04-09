const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  return digits;
}

function normalizeUserId(raw) {
  const s = String(raw).trim();
  if (!s) return { ok: false, error: 'id is required' };
  if (EMAIL_RE.test(s)) return { ok: true, id: s.toLowerCase() };
  const phone = normalizePhone(s);
  if (phone.length >= 10 && phone.length <= 15) return { ok: true, id: phone };
  return { ok: false, error: 'id must be email or phone (10–15 digits)' };
}

module.exports = { normalizeUserId };
