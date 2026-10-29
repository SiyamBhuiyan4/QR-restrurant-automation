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
          visible.add(video);
          if (video.preload === 'none') video.preload = 'auto';
          if (heldForScroll.size) {
            heldForScroll.add(video); // starts once the fast scroll settles
          } else if (video.paused) {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
        } else {
          visible.delete(video);
          heldForScroll.delete(video);
          if (!video.paused) video.pause();
        }
      }
    },
    // Only cards actually on screen play (the files are already on the phone, see videoCache.js)
    { rootMargin: '0px', threshold: 0.15 }
  );

  // During a fast scroll, cards hold a still frame and pick up again ~150 ms after scrolling
  // slows down, so the phone is not decoding several videos while it is busy scrolling.
  const visible = new Set();
  const heldForScroll = new Set();
  let lastY = window.scrollY;
  let lastT = performance.now();
  let resumeTimer = 0;
  const resume = () => {
    for (const video of heldForScroll) {
      if (visible.has(video) && video.paused) {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    }
    heldForScroll.clear();
  };
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const speed = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastT); // px per ms
    lastY = window.scrollY;
    lastT = now;
    if (speed > 1.2) {
      for (const video of visible) {
        if (!video.paused) {
          video.pause();
          heldForScroll.add(video);
        }
      }
    }
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(resume, 150);
  }, { passive: true });

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
