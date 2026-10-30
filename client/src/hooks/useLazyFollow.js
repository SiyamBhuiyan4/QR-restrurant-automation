import { useEffect } from 'react';

/**
 * Lazy follow for a fixed, vertically centred element (the order-step rail).
 *
 * When the page scrolls, the element first moves with the page as if attached to it; it can't
 * leave the screen, so at the top or bottom edge it gets dragged along. Once scrolling stops it
 * glides back to the middle. The offset is written straight to the element's transform (no
 * React render per frame), and the frame loop only runs while the element is away from the
 * middle. Reduced-motion users get a still element.
 *
 * ref:     the element (positioned with top: 50% and translateY(-50%))
 * enabled: run only while the element is shown
 */
const EDGE_GAP = 16; // px kept between the element and the screen edge
const RETURN = 0.075; // share of the distance back to the middle covered each frame

export default function useLazyFollow(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let offset = 0;
    let lastY = window.scrollY;
    let frame = 0;

    const apply = () => {
      el.style.transform = `translateY(calc(-50% + ${offset.toFixed(1)}px))`;
    };
    const tick = () => {
      offset *= 1 - RETURN;
      if (Math.abs(offset) < 0.5) {
        offset = 0;
        frame = 0;
      } else {
        frame = requestAnimationFrame(tick);
      }
      apply();
    };
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      // Move with the page, but never past the screen edges
      const room = Math.max(0, (window.innerHeight - el.offsetHeight) / 2 - EDGE_GAP);
      offset = Math.max(-room, Math.min(room, offset - delta));
      apply();
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };
  }, [ref, enabled]);
}
