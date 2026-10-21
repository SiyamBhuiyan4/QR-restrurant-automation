/**
 * Plays <video data-play-when-visible> only while it is on screen and pauses it
 * otherwise. Paired with preload="none", off-screen dish videos are neither
 * downloaded nor decoded, which keeps the customer menu smooth on phones.
 * One shared IntersectionObserver; a MutationObserver picks up videos added later.
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
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      }
    },
    { rootMargin: '150px 0px', threshold: 0.1 }
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
