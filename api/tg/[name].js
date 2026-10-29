// Permanent link for a file in the Telegram channel: /api/tg/<file_id>.<ext>
//
// The files stay in Telegram. This only looks up Telegram's short-lived download path for the
// file_id (valid ~1 hour) and streams the file through, so saved links never expire and no
// database is involved. Whole-file responses are cached on Vercel's CDN, so Telegram is asked
// once per file instead of on every view; video byte ranges are passed through as they are.
import { TELEGRAM_BOT_TOKEN } from '../../client/src/services/telegramClient.js';

export const config = { runtime: 'edge' };

const FILE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
const TYPES = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const PATH_TTL_MS = 50 * 60 * 1000;
const pathCache = new Map(); // file_id -> { path, at } (per edge instance)

async function filePath(token, fileId, fresh) {
  const hit = pathCache.get(fileId);
  if (!fresh && hit && Date.now() - hit.at < PATH_TTL_MS) return hit.path;
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = await res.json().catch(() => null);
  const path = data?.ok ? data.result?.file_path : null;
  if (path) pathCache.set(fileId, { path, at: Date.now() });
  return path;
}

export default async function handler(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
  const name = decodeURIComponent(new URL(request.url).pathname.split('/').pop() || '');
  const [fileId, ext = ''] = name.split('.');
  if (!FILE_ID_RE.test(fileId || '')) return new Response('Bad file id', { status: 400 });
  if (!token) return new Response('Telegram is not configured', { status: 500 });

  const range = request.headers.get('range');
  const fetchFile = async (fresh) => {
    const path = await filePath(token, fileId, fresh);
    if (!path) return null;
    return fetch(`https://api.telegram.org/file/bot${token}/${path}`, range ? { headers: { Range: range } } : undefined);
  };

  let upstream = await fetchFile(false);
  // A cached path can go stale before our TTL; look it up again once
  if (!upstream || (!upstream.ok && upstream.status !== 416)) upstream = await fetchFile(true);
  if (!upstream) return new Response('File not found on Telegram', { status: 404 });
  if (!upstream.ok && upstream.status !== 416) return new Response('Telegram error', { status: 502 });

  const headers = new Headers();
  headers.set('Content-Type', TYPES[ext.toLowerCase()] || upstream.headers.get('content-type') || 'application/octet-stream');
  headers.set('Accept-Ranges', 'bytes');
  for (const h of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const val = upstream.headers.get(h);
    if (val) headers.set(h, val);
  }
  // Partial (range) responses stay out of the shared CDN cache so it never stores a fragment
  headers.set(
    'Cache-Control',
    upstream.status === 200 ? 'public, max-age=86400, s-maxage=31536000, immutable' : 'public, max-age=86400'
  );
  return new Response(upstream.body, { status: upstream.status, headers });
}
