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

// Every earlier copy of the bundled demo video (reel-chef.mp4 and its 480p / 360p versions) is
// now the one 360p demo clip; menus saved on phones or in the database still hold the old links
const OLD_DEMO_VIDEO_RE = /\/videos\/reel-chef(?:-480|-360)?\.mp4$/;
const DEMO_VIDEO = '/videos/demo-dish-360.mp4';

// Uploaded videos are saved as one link: the 480p copy (Reels, dish page) with the 360p card
// copy's Telegram file id attached as ?sd=<file_id>. /api/tg ignores the query, so the link
// plays the 480p copy anywhere; menu cards ask cardVideoUrl() for the 360p one.
const FILE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

export function withCardVideo(url, cardFileId) {
  if (!url || !cardFileId || !FILE_ID_RE.test(cardFileId)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}sd=${cardFileId}`;
}

// The file menu cards play: the 360p copy when there is one, otherwise the video itself
// (the bundled demo clip is already 360p)
export function cardVideoUrl(url) {
  const full = permanentMediaUrl(url);
  if (typeof full !== 'string') return full;
  const sd = full.match(/[?&]sd=([A-Za-z0-9_-]{10,200})(?:&|$)/);
  return sd ? telegramMediaUrl(sd[1], 'mp4') : full;
}

export function permanentMediaUrl(url) {
  if (typeof url !== 'string') return url;
  if (OLD_DEMO_VIDEO_RE.test(url)) return url.replace(OLD_DEMO_VIDEO_RE, DEMO_VIDEO);
  const m = url.match(CONVEX_TG_RE);
  return m ? telegramMediaUrl(m[1], m[2].toLowerCase()) : url;
}
