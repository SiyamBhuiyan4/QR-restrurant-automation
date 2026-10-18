import { useCallback, useEffect, useRef, useState } from 'react';

// Page-turn duration in milliseconds. Matches the CSS flip animation.
export const FLIP_DURATION_MS = 650;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
};

const isEditableTarget = (el) => {
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
};

export function useBookFlip(spreadCount, { initial = 0 } = {}) {
  const count = Number.isFinite(spreadCount) ? Math.max(0, Math.floor(spreadCount)) : 0;
  const maxIndex = Math.max(count - 1, 0);

  const [rawIndex, setRawIndex] = useState(() => clamp(Number(initial) || 0, 0, maxIndex));
  const [direction, setDirection] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // Clamp at read time so a shrinking spreadCount never exposes an out-of-range index.
  const spreadIndex = clamp(rawIndex, 0, maxIndex);

  // Refs let the stable callbacks read current values without stale closures
  // and guard against rapid double-clicks before a re-render lands.
  const indexRef = useRef(spreadIndex);
  const flippingRef = useRef(false);
  const timerRef = useRef(null);
  const maxRef = useRef(maxIndex);
  indexRef.current = spreadIndex;
  maxRef.current = maxIndex;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onFlipEnd = useCallback(() => {
    clearTimer();
    if (!flippingRef.current) return;
    flippingRef.current = false;
    setIsFlipping(false);
    setDirection(null);
  }, [clearTimer]);

  const commit = useCallback((target, dir) => {
    const nextIndex = clamp(target, 0, maxRef.current);
    if (nextIndex === indexRef.current || flippingRef.current) return;

    indexRef.current = nextIndex;
    setRawIndex(nextIndex);

    const duration = prefersReducedMotion() ? 0 : FLIP_DURATION_MS;
    if (duration === 0) {
      // Reduced motion: change the page immediately, no flipping state.
      setDirection(null);
      return;
    }

    flippingRef.current = true;
    setDirection(dir);
    setIsFlipping(true);
    clearTimer();
    timerRef.current = setTimeout(onFlipEnd, duration);
  }, [clearTimer, onFlipEnd]);

  const next = useCallback(() => {
    commit(indexRef.current + 1, 'next');
  }, [commit]);

  const prev = useCallback(() => {
    commit(indexRef.current - 1, 'prev');
  }, [commit]);

  const goTo = useCallback((target) => {
    const n = Number(target);
    if (!Number.isFinite(n)) return;
    const dir = n > indexRef.current ? 'next' : 'prev';
    commit(Math.round(n), dir);
  }, [commit]);

  // Keep the flip state consistent if spreadCount shrinks mid-session.
  useEffect(() => {
    if (rawIndex !== spreadIndex) setRawIndex(spreadIndex);
  }, [rawIndex, spreadIndex]);

  // Keyboard navigation. Skipped while the user is typing in a form control.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev]);

  // Cleanup pending flip timer on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  return {
    spreadIndex,
    direction,
    canPrev: count > 0 && spreadIndex > 0,
    canNext: count > 0 && spreadIndex < maxIndex,
    next,
    prev,
    goTo,
    isFlipping,
    onFlipEnd,
  };
}

export default useBookFlip;
