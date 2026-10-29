/**
 * Downloads videos once into the phone's cache so they play from the device afterwards.
 *
 * Files are fetched whole, one at a time (so the menu itself stays quick), into the same
 * Cache Storage bucket the service worker reads ('menu-videos', see vite.config.js). The
 * worker then answers the <video> element's byte-range requests straight from that copy.
 *
 * prefetchVideos(urls)                     - queue in order (the whole menu)
 * prefetchVideos(urls, { priority: true }) - jump the queue (the reels around the one playing)
 *
 * Only same-origin files can be cached this way (/videos/... and /api/tg/... Telegram links).
 */
export const VIDEO_CACHE = 'menu-videos';

const VIDEO_RE = /\.(?:mp4|webm|mov|m4v)$/i;
const queue = [];
const seen = new Set();
let running = false;

function toCacheableUrl(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin || !VIDEO_RE.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function work() {
  if (running) return;
  running = true;
  try {
    const cache = await caches.open(VIDEO_CACHE);
    while (queue.length) {
      const url = queue.shift();
      try {
        if (await cache.match(url)) continue;
        const res = await fetch(url, { credentials: 'same-origin' });
        if (res.status === 200) await cache.put(url, res);
        else seen.delete(url);
      } catch {
        seen.delete(url); // try again next time it is requested
      }
    }
  } catch {
    // Cache Storage unavailable (private mode, quota): videos just stream as usual
  } finally {
    running = false;
  }
}

export function prefetchVideos(urls, { priority = false } = {}) {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return;
  const fresh = [];
  for (const raw of urls || []) {
    const url = toCacheableUrl(raw);
    if (!url) continue;
    if (priority) {
      // Move it to the front even if it was already waiting further back
      const at = queue.indexOf(url);
      if (at !== -1) queue.splice(at, 1);
      else if (seen.has(url)) continue; // already downloaded or downloading
      seen.add(url);
      fresh.push(url);
    } else if (!seen.has(url)) {
      seen.add(url);
      fresh.push(url);
    }
  }
  if (!fresh.length) return;
  if (priority) queue.unshift(...fresh);
  else queue.push(...fresh);
  work();
}
