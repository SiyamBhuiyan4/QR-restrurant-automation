/**
 * Plays every <video data-play-when-visible> that is on screen and pauses it once it
 * scrolls away. Paired with preload="none", videos nobody can see are
 * neither downloaded nor decoded. One shared IntersectionObserver; a MutationObserver picks
 * up videos added later.
 */
let started = false;

export function startVisibleVideos() {
  if (started || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  started = true;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (video.preload === 'none') video.preload = 'auto';
          if (video.paused) {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
        } else if (!video.paused) {
          video.pause();
        }
      }
    },
    // Only cards actually on screen play (the files are already on the phone, see videoCache.js)
    { rootMargin: '0px', threshold: 0.15 }
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
