/**
 * The restaurant's database, kept in the Telegram media channel.
 *
 * The whole database is one JSON snapshot ({ version, updated_at, tables }), encrypted and
 * posted to the channel as a document. The channel's pinned message belongs to another app,
 * so the pointer to the newest snapshot lives in the channel description instead, on a line
 *   [smartdine-db] v=<version> m=<message_id> f=<file_id>
 * below whatever text the description already has.
 *
 * Writes take a lock first, also kept in the description:
 *   [smartdine-db-lock] <writer id> <expires at, ms>
 * A writer sets its lock line, waits a moment and reads it back; only the writer that still
 * sees its own id goes ahead (the others wait and try again). Locks expire on their own, so a
 * crashed writer can't block the database. While holding the lock the writer loads the newest
 * snapshot, applies its change and saves; saving clears the lock in the same edit.
 *
 * Encryption: AES-256-GCM with a key from SMARTDINE_DB_SECRET. The bot token is public in the
 * repo, so without this anyone could read staff logins or plant a fake database; with it, a
 * snapshot that doesn't decrypt is rejected.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// The label can be changed (SMARTDINE_DB_TAG) so a test run never touches the real data
const TAG = (process.env.SMARTDINE_DB_TAG || 'smartdine-db').replace(/[^a-z0-9-]/gi, '');
const POINTER_RE = new RegExp(`\\[${TAG}\\] v=(\\d+) m=(\\d+) f=([A-Za-z0-9_-]+)`);
const LOCK_RE = new RegExp(`\\[${TAG}-lock\\] ([a-f0-9]+) (\\d+)`);
const LOCK_MS = 15000; // a lock older than this is ignored (crashed writer)
const LOCK_SETTLE_MS = 450; // wait before reading our lock back
const LOCK_WAIT_MS = 20000; // give up waiting for the lock after this

export class ConflictError extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function config() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const secret = process.env.SMARTDINE_DB_SECRET;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set on the server');
  if (!secret || secret.length < 16) throw new Error('SMARTDINE_DB_SECRET (16+ characters) is not set on the server');
  return { token, chatId, key: createHash('sha256').update(secret).digest() };
}

async function tg(token, method, params, { form } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, form
      ? { method: 'POST', body: form }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params || {}) });
    const data = await res.json().catch(() => null);
    if (data?.ok) return data.result;
    // Telegram says "too many requests": wait as long as it asks, a few times
    const retryAfter = data?.parameters?.retry_after;
    if (data?.error_code === 429 && retryAfter && attempt < 3) {
      await sleep(retryAfter * 1000 + 100);
      continue;
    }
    const err = new Error(`Telegram ${method} failed: ${data?.description || res.status}`);
    err.description = data?.description || '';
    throw err;
  }
}

function encrypt(key, obj) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return JSON.stringify({ alg: 'A256GCM', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}
function decrypt(key, text) {
  const box = JSON.parse(text);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}

async function readDescription(token, chatId) {
  const chat = await tg(token, 'getChat', { chat_id: chatId });
  const description = chat.description || '';
  const p = description.match(POINTER_RE);
  const l = description.match(LOCK_RE);
  return {
    // The channel's own text, without our lines
    base: description.replace(POINTER_RE, '').replace(LOCK_RE, '').replace(/\n{2,}/g, '\n').trim(),
    pointer: p ? { version: Number(p[1]), messageId: Number(p[2]), fileId: p[3] } : null,
    lock: l ? { id: l[1], expiresAt: Number(l[2]) } : null
  };
}

async function writeDescription(token, chatId, { base, pointer, lock }) {
  const lines = [base];
  if (pointer) lines.push(`[${TAG}] v=${pointer.version} m=${pointer.messageId} f=${pointer.fileId}`);
  if (lock) lines.push(`[${TAG}-lock] ${lock.id} ${lock.expiresAt}`);
  try {
    await tg(token, 'setChatDescription', { chat_id: chatId, description: lines.filter(Boolean).join('\n') });
  } catch (err) {
    if (!/not modified/i.test(err.description)) throw err;
  }
}

// Decrypted snapshots by file id (a file id never changes content), newest few only
const cache = new Map();

async function download(token, key, fileId) {
  if (cache.has(fileId)) return structuredClone(cache.get(fileId));
  const file = await tg(token, 'getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!res.ok) throw new Error(`Telegram file download failed: ${res.status}`);
  const snapshot = decrypt(key, await res.text());
  cache.set(fileId, snapshot);
  while (cache.size > 3) cache.delete(cache.keys().next().value);
  return structuredClone(snapshot);
}

const emptySnapshot = () => ({ version: 0, updated_at: new Date().toISOString(), tables: {} });

/** Load the newest snapshot (no lock). Returns { snapshot, version } (0 = nothing saved yet). */
export async function loadSnapshot() {
  const { token, chatId, key } = config();
  const { pointer } = await readDescription(token, chatId);
  if (!pointer) return { snapshot: emptySnapshot(), version: 0 };
  const snapshot = await download(token, key, pointer.fileId);
  return { snapshot, version: pointer.version };
}

// One writer at a time inside this server instance too
let localQueue = Promise.resolve();

async function acquireLock(token, chatId) {
  const id = randomBytes(6).toString('hex');
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (let attempt = 0; Date.now() < deadline; attempt++) {
    const desc = await readDescription(token, chatId);
    if (desc.lock && desc.lock.id !== id && desc.lock.expiresAt > Date.now()) {
      await sleep(250 + Math.random() * 350);
      continue;
    }
    await writeDescription(token, chatId, { ...desc, lock: { id, expiresAt: Date.now() + LOCK_MS } });
    await sleep(LOCK_SETTLE_MS);
    const check = await readDescription(token, chatId);
    if (check.lock?.id === id) return { id, desc: check };
    await sleep(200 + Math.random() * 400);
  }
  throw new ConflictError('The database is busy, please try again');
}

/**
 * Change the database under the write lock.
 * change(snapshot, version) gets the newest data (a copy it may modify) and returns true if it
 * changed anything. Returns the saved version (or the unchanged one).
 */
export function withWriteLock(change) {
  const run = async () => {
    const { token, chatId, key } = config();
    const { id, desc } = await acquireLock(token, chatId);
    let released = false;
    try {
      const { pointer } = desc;
      const version = pointer?.version || 0;
      const snapshot = pointer ? await download(token, key, pointer.fileId) : emptySnapshot();
      const changed = await change(snapshot, version);
      if (!changed) return version;

      const next = version + 1;
      const body = { ...snapshot, version: next, updated_at: new Date().toISOString() };
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('disable_notification', 'true');
      form.append('caption', `SmartDine data (${TAG}) v${next}`);
      form.append('document', new Blob([encrypt(key, body)], { type: 'application/json' }), `${TAG}-v${next}.json`);
      const sent = await tg(token, 'sendDocument', null, { form });

      // New pointer and lock release in one edit
      await writeDescription(token, chatId, {
        base: desc.base,
        pointer: { version: next, messageId: sent.message_id, fileId: sent.document.file_id },
        lock: null
      });
      released = true;
      cache.set(sent.document.file_id, structuredClone(body));
      if (pointer?.messageId) {
        tg(token, 'deleteMessage', { chat_id: chatId, message_id: pointer.messageId }).catch(() => {});
      }
      return next;
    } finally {
      if (!released) {
        // Nothing saved (no change, or an error): just drop our lock (only if it's still ours)
        const now = await readDescription(token, chatId).catch(() => null);
        if (now?.lock?.id === id) await writeDescription(token, chatId, { ...now, lock: null }).catch(() => {});
      }
    }
  };
  const result = localQueue.then(run, run);
  localQueue = result.catch(() => {});
  return result;
}
