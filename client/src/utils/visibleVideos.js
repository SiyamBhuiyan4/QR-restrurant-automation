/**
 * Menu-card videos, played like a feed: only the card(s) nearest the middle of the screen
 * play, and only those cards have a <video> element at all.
 *
 * Every card shows its photo. Its media box carries the video address in data-card-video.
 * ~180 ms after scrolling stops, the visible card(s) closest to the screen's centre (one,
 * two on large desktop screens) get a muted, looping video laid over the photo; it fades in
 * once it has frames. While the page scrolls, and when a card loses that spot, its video is
 * removed again, which frees the decoder and its layer. (With a paused <video> on every card the browser still had to
 * composite ~30 video layers, which made scrolling stutter.)
 *
 * One shared IntersectionObserver; a MutationObserver picks up cards added later.
 */
const SETTLE_MS = 180;
const ATTR = 'data-card-video';
const playCount = () => (window.innerWidth < 1024 ? 1 : 2);

let started = false;

function attachVideo(box) {
  if (box.querySelector('video.plate-card__video')) return;
  const video = document.createElement('video');
  video.className = 'plate-card__video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.addEventListener('playing', () => video.classList.add('is-ready'), { once: true });
  video.addEventListener('error', () => detachVideo(box), { once: true });
  video.src = box.getAttribute(ATTR);
  box.appendChild(video);
  const p = video.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

function detachVideo(box) {
  const video = box.querySelector('video.plate-card__video');
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.load(); // releases the decoder
  video.remove();
}

export function startVisibleVideos() {
  if (started || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  started = true;

  const visible = new Set();
  let scrolling = false;
  let settleTimer = 0;

  // Give the `playCount()` visible cards nearest the centre a playing video; nobody else has one
  const choose = () => {
    if (scrolling || document.visibilityState === 'hidden') return;
    const mid = window.innerHeight / 2;
    const ranked = [...visible]
      .filter((box) => box.isConnected && box.getAttribute(ATTR))
      .map((box) => {
        const r = box.getBoundingClientRect();
        return { box, d: Math.abs(r.top + r.height / 2 - mid) };
      })
      .sort((a, b) => a.d - b.d);
    const keep = new Set(ranked.slice(0, playCount()).map((x) => x.box));
    document.querySelectorAll(`[${ATTR}]`).forEach((box) => {
      if (keep.has(box)) attachVideo(box);
      else detachVideo(box);
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else {
          visible.delete(entry.target);
          detachVideo(entry.target);
        }
      }
      choose();
    },
    { rootMargin: '0px', threshold: 0.35 }
  );

  window.addEventListener(
    'scroll',
    () => {
      if (!scrolling) {
        scrolling = true;
        // Scroll with photos only: even paused videos cost the browser a layer per frame
        document.querySelectorAll(`[${ATTR}]`).forEach(detachVideo);
      }
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        scrolling = false;
        choose();
      }, SETTLE_MS);
    },
    { passive: true }
  );
  window.addEventListener('resize', choose, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') document.querySelectorAll('video.plate-card__video').forEach((v) => v.pause());
    else choose();
  });

  const watched = new WeakSet();
  const watch = (box) => {
    if (watched.has(box)) return;
    watched.add(box);
    io.observe(box);
  };
  const scan = (root) => {
    if (root.querySelectorAll) root.querySelectorAll(`[${ATTR}]`).forEach(watch);
  };

  scan(document);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(`[${ATTR}]`)) watch(node);
        else scan(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
