/**
 * Permanent links for files kept in the Telegram channel.
 *
 * /api/tg/<file_id>.<ext> on the customer site (api/tg/[name].js) streams the file from
 * Telegram, so a saved link never expires (Telegram's own download links last about an hour)
 * and no database is involved. Older links that went through the Convex route are rewritten
 * to it, so they keep working whether or not Convex is up.
 */
export const MEDIA_BASE = import.meta.env?.VITE_MEDIA_BASE_URL || 'https://qr-restaurant-automation.vercel.app';

const CONVEX_TG_RE = /^https:\/\/[^/]+\.convex\.site\/telegram-media\/([A-Za-z0-9_-]{10,200})\.([A-Za-z0-9]{2,5})$/;

export const telegramMediaUrl = (fileId, ext) => `${MEDIA_BASE}/api/tg/${fileId}.${ext}`;

export function permanentMediaUrl(url) {
  if (typeof url !== 'string') return url;
  const m = url.match(CONVEX_TG_RE);
  return m ? telegramMediaUrl(m[1], m[2].toLowerCase()) : url;
}
