import { useEffect } from 'react';

/**
 * Pushed rail: a fixed element that behaves like a block resting on the page, pushed along by
 * the window's edges (used for the wide-screen order-step rail).
 *
 * It starts in the middle of the screen. While the page scrolls it stays in its place on the
 * page (so it moves with the content) until it touches the top or bottom of the window; from
 * then on that edge pushes it along. While an edge is pushing, the element gets the class
 * `is-pushed-top` / `is-pushed-bottom` (friction sparks in CSS). When scrolling stops it stays
 * where it was left.
 *
 * Positions are written straight to the element's transform (no React render per scroll).
 *
 * ref:     the element (position: fixed; top: 0)
 * enabled: run only while the element is shown
 */
const TOP_EDGE = 80; // clear of the sticky header
const BOTTOM_EDGE = 16;
const PUSH_HOLD_MS = 450; // sparks keep flying this long after the last push

export default function usePushedRail(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;

    let lastY = window.scrollY;
    let pos = 0;
    let pushTimer = 0;

    const limits = () => {
      const max = window.innerHeight - el.offsetHeight - BOTTOM_EDGE;
      return [TOP_EDGE, Math.max(TOP_EDGE, max)];
    };
    const apply = () => {
      el.style.transform = `translateY(${Math.round(pos)}px)`;
    };
    const setPushed = (edge) => {
      el.classList.toggle('is-pushed-top', edge === 'top');
      el.classList.toggle('is-pushed-bottom', edge === 'bottom');
      clearTimeout(pushTimer);
      if (edge) pushTimer = setTimeout(() => setPushed(null), PUSH_HOLD_MS);
    };

    // Start in the middle of the screen
    const [minTop, maxTop] = limits();
    pos = Math.min(maxTop, Math.max(minTop, (window.innerHeight - el.offsetHeight) / 2));
    apply();

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (!delta) return;
      const [lo, hi] = limits();
      const free = pos - delta; // where the page would carry it
      pos = Math.min(hi, Math.max(lo, free));
      apply();
      if (free < lo) setPushed('top');
      else if (free > hi) setPushed('bottom');
    };
    const onResize = () => {
      const [lo, hi] = limits();
      pos = Math.min(hi, Math.max(lo, pos));
      apply();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      clearTimeout(pushTimer);
      el.classList.remove('is-pushed-top', 'is-pushed-bottom');
      el.style.transform = '';
    };
  }, [ref, enabled]);
}
