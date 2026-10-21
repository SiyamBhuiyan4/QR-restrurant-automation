const express = require('express');
const router = express.Router();

/**
 * Admin authentication.
 *
 * The master admin PIN lives only on the server. Set ADMIN_MASTER_PIN in the
 * environment to override it. The fallback keeps the existing setup working.
 */
const DEFAULT_ADMIN_PIN = '808080';
const ADMIN_PIN = String(process.env.ADMIN_MASTER_PIN || DEFAULT_ADMIN_PIN).trim();

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// In-memory failed-attempt tracker keyed by client IP.
const failedAttempts = new Map();

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

function pruneEntry(ip, now) {
  const entry = failedAttempts.get(ip);
  if (entry && now - entry.windowStart >= WINDOW_MS) {
    failedAttempts.delete(ip);
    return undefined;
  }
  return entry;
}

function isBlocked(ip, now) {
  const entry = pruneEntry(ip, now);
  return Boolean(entry && entry.count >= MAX_FAILED_ATTEMPTS);
}

function recordFailure(ip, now) {
  const entry = pruneEntry(ip, now);
  if (entry) {
    entry.count += 1;
  } else {
    failedAttempts.set(ip, { count: 1, windowStart: now });
  }
}

/**
 * POST /api/auth/admin-pin  { pin } -> { ok: boolean }
 */
router.post('/admin-pin', (req, res) => {
  const now = Date.now();
  const ip = clientIp(req);

  if (isBlocked(ip, now)) {
    return res.status(429).json({ ok: false, reason: 'rate-limited', error: 'Too many failed attempts. Try again later.' });
  }

  const pin = String(req.body?.pin ?? '').trim();
  if (pin && pin === ADMIN_PIN) {
    failedAttempts.delete(ip);
    return res.json({ ok: true });
  }

  recordFailure(ip, now);
  return res.json({ ok: false });
});

/**
 * POST /api/auth/staff-login  { staffId | username, password } -> { ok, staff }
 *
 * The server has no staff credential table, so staff login stays client-side.
 * Responds with reason 'use-client' so the client falls back to its local check.
 */
router.post('/staff-login', (req, res) => {
  return res.json({ ok: false, reason: 'use-client' });
});

module.exports = router;
