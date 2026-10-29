/**
 * Dish cards glide in (fade + rise) the first time they scroll into view.
 *
 * Only opacity and `translate` animate, so it runs on the GPU. A card is only hidden once
 * this script has seen it below the screen, so nothing is ever left invisible: if React
 * re-renders a card mid-way, it simply shows. Cards already on screen at load show at once.
 */
let started = false;

export function startCardReveal() {
  if (started || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  started = true;

  const io = new IntersectionObserver(
    (entries) => {
      const arriving = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      // Cards arriving together (one row) follow each other by a beat
      arriving.forEach((card, i) => {
        io.unobserve(card);
        card.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
        card.classList.add('is-in');
        setTimeout(() => {
          card.classList.remove('card-reveal', 'is-in');
          card.style.transitionDelay = '';
        }, 1100);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );

  const watched = new WeakSet();
  const watch = (card) => {
    if (watched.has(card)) return;
    watched.add(card);
    if (card.getBoundingClientRect().top < window.innerHeight) return; // already visible
    card.classList.add('card-reveal');
    io.observe(card);
  };
  const scan = (root) => {
    if (root.matches?.('.plate-card')) watch(root);
    root.querySelectorAll?.('.plate-card').forEach(watch);
  };

  scan(document);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
