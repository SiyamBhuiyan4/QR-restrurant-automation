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

// The bundled demo video moved to a lighter 480p file; menus saved on phones still hold the old link
const LEGACY_DEMO_VIDEO_RE = /\/videos\/reel-chef\.mp4$/;

// Menu cards are small and always muted, so they play a lighter 360p copy of the bundled demo
// video; Reels and dish details keep the 480p one. Other videos are used as they are.
const DEMO_VIDEO_480_RE = /\/videos\/reel-chef-480\.mp4$/;
export function cardVideoUrl(url) {
  if (typeof url !== 'string') return url;
  return permanentMediaUrl(url).replace(DEMO_VIDEO_480_RE, '/videos/reel-chef-360.mp4');
}

export function permanentMediaUrl(url) {
  if (typeof url !== 'string') return url;
  if (LEGACY_DEMO_VIDEO_RE.test(url)) return url.replace(LEGACY_DEMO_VIDEO_RE, '/videos/reel-chef-480.mp4');
  const m = url.match(CONVEX_TG_RE);
  return m ? telegramMediaUrl(m[1], m[2].toLowerCase()) : url;
}
