/**
 * Plays <video data-play-when-visible> only while it is on screen (at most a couple at a
 * time) and pauses it otherwise. Paired with preload="none", off-screen dish videos are neither
 * downloaded nor decoded, which keeps the customer menu smooth on phones.
 * One shared IntersectionObserver; a MutationObserver picks up videos added later.
 */
let started = false;

export function startVisibleVideos() {
  if (started || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  started = true;

  // Phones choke when several videos decode at once, so only the most-visible card plays there
  // (two on larger screens), and none on data-saver or slow connections (the photo shows instead).
  const conn = navigator.connection || {};
  const lowData = conn.saveData === true || /(^|-)2g|3g/.test(conn.effectiveType || '');
  const isPhone = window.matchMedia?.('(pointer: coarse), (max-width: 640px)').matches;
  const MAX_PLAYING = lowData ? 0 : isPhone ? 1 : 2;
  const ratios = new Map();

  // Wait until scrolling settles before starting videos, so flinging through the menu stays light
  let scrolling = false;
  let scrollTimer = 0;
  window.addEventListener('scroll', () => {
    scrolling = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrolling = false; refresh(); }, 180);
  }, { passive: true, capture: true });

  const refresh = () => {
    const ranked = [...ratios.entries()]
      .filter(([, r]) => r >= 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PLAYING)
      .map(([v]) => v);
    const keep = new Set(ranked);
    for (const [video] of ratios) {
      if (!video.isConnected) {
        ratios.delete(video);
      } else if (!keep.has(video) && !video.paused) {
        video.pause();
      }
    }
    if (scrolling) return;
    for (const video of ranked) {
      if (video.preload === 'none') video.preload = 'auto';
      if (video.paused) {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) ratios.set(entry.target, entry.intersectionRatio);
        else ratios.delete(entry.target);
        if (!entry.isIntersecting && !entry.target.paused) entry.target.pause();
      }
      refresh();
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  const watched = new WeakSet();
  const scan = (root) => {
    const list = root.querySelectorAll ? root.querySelectorAll('video[data-play-when-visible]') : [];
    for (const v of list) {
      if (!watched.has(v)) {
        watched.add(v);
        io.observe(v);
      }
    }
  };

  scan(document);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('video[data-play-when-visible]') && !watched.has(node)) {
          watched.add(node);
          io.observe(node);
        } else {
          scan(node);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
