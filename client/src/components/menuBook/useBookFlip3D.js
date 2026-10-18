import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 3D Page Flip Duration in milliseconds.
 * Must stay in sync with --mb-flip-duration in styles/menu-book-3d-flip.css.
 */
export const FLIP_DURATION_MS = 750;

/**
 * Safety buffer for the fallback timer in case CSS animationend is dropped
 * (e.g. tab backgrounded, process throttled, or DOM node unmounted).
 */
export const FLIP_TIMEOUT_BUFFER_MS = 160;

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

/**
 * useBookFlip3D
 *
 * State machine: 'idle' -> 'flipping' -> 'settled' -> 'idle'
 *
 * Flipping state retains:
 *   - currentSpreadIndex: spread visible before flip (does NOT change until flip ends)
 *   - targetSpreadIndex:  spread being turned to
 *   - direction:          'next' or 'prev'
 *   - progress:           0 to 1
 *   - isFlipping:         boolean
 *
 * The flip does NOT commit `currentSpreadIndex = targetSpreadIndex` until
 * `onFlipEnd` is triggered, eliminating text jumps and flickering.
 *
 * @param {number} spreadCount Total number of two-page spreads.
 * @param {object} [options]
 * @param {number} [options.initial=0] Starting spread index.
 * @param {number} [options.duration=FLIP_DURATION_MS] Animation duration in ms.
 * @param {boolean} [options.enableKeyboard=true] Enable left/right arrow keys.
 */
export function useBookFlip3D(spreadCount, {
  initial = 0,
  duration = FLIP_DURATION_MS,
  enableKeyboard = true,
} = {}) {
  const count = Number.isFinite(spreadCount) ? Math.max(0, Math.floor(spreadCount)) : 0;
  const maxIndex = Math.max(count - 1, 0);

  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(() => clamp(Number(initial) || 0, 0, maxIndex));
  const [targetSpreadIndex, setTargetSpreadIndex] = useState(null);
  const [direction, setDirection] = useState(null);
  const [flipState, setFlipState] = useState('idle'); // 'idle' | 'flipping' | 'settled'
  const [progress, setProgress] = useState(0);

  const currentRef = useRef(currentSpreadIndex);
  const targetRef = useRef(targetSpreadIndex);
  const flippingRef = useRef(false);
  const timerRef = useRef(null);
  const settleTimerRef = useRef(null);
  const maxRef = useRef(maxIndex);

  currentRef.current = currentSpreadIndex;
  targetRef.current = targetSpreadIndex;
  maxRef.current = maxIndex;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  /**
   * Called when the CSS animation completes or fallback timer expires.
   * Commits currentSpreadIndex = targetSpreadIndex and settles state.
   */
  const onFlipEnd = useCallback(() => {
    clearTimer();
    if (!flippingRef.current) return;

    const finalTarget = targetRef.current;
    flippingRef.current = false;

    if (finalTarget !== null && Number.isFinite(finalTarget)) {
      currentRef.current = finalTarget;
      setCurrentSpreadIndex(finalTarget);
    }

    setTargetSpreadIndex(null);
    setDirection(null);
    setProgress(1);
    setFlipState('settled');

    // Smoothly transition from settled back to idle on the next cycle
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      setFlipState('idle');
      setProgress(0);
    }, 60);
  }, [clearTimer, clearSettleTimer]);

  /**
   * Core commit function to trigger a page turn.
   */
  const commit = useCallback((target, dir) => {
    const nextIndex = clamp(target, 0, maxRef.current);
    if (nextIndex === currentRef.current || flippingRef.current) return;

    const reduced = prefersReducedMotion() || duration <= 0;
    if (reduced) {
      // Instant switch for reduced motion preferences
      clearTimer();
      clearSettleTimer();
      currentRef.current = nextIndex;
      targetRef.current = null;
      flippingRef.current = false;
      setCurrentSpreadIndex(nextIndex);
      setTargetSpreadIndex(null);
      setDirection(null);
      setProgress(0);
      setFlipState('idle');
      return;
    }

    // Begin flip transition
    flippingRef.current = true;
    targetRef.current = nextIndex;
    setTargetSpreadIndex(nextIndex);
    setDirection(dir);
    setFlipState('flipping');
    setProgress(0);

    clearTimer();
    timerRef.current = setTimeout(onFlipEnd, duration + FLIP_TIMEOUT_BUFFER_MS);
  }, [clearTimer, clearSettleTimer, duration, onFlipEnd]);

  const next = useCallback(() => {
    commit(currentRef.current + 1, 'next');
  }, [commit]);

  const prev = useCallback(() => {
    commit(currentRef.current - 1, 'prev');
  }, [commit]);

  const goTo = useCallback((target) => {
    const n = Number(target);
    if (!Number.isFinite(n)) return;
    const rounded = Math.round(n);
    if (rounded === currentRef.current) return;
    const dir = rounded > currentRef.current ? 'next' : 'prev';
    commit(rounded, dir);
  }, [commit]);

  // Keep spread index clamped if spreadCount shrinks
  useEffect(() => {
    if (currentSpreadIndex > maxIndex) {
      const clamped = clamp(currentSpreadIndex, 0, maxIndex);
      currentRef.current = clamped;
      setCurrentSpreadIndex(clamped);
    }
  }, [currentSpreadIndex, maxIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard || typeof window === 'undefined') return undefined;

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
  }, [enableKeyboard, next, prev]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearSettleTimer();
    };
  }, [clearTimer, clearSettleTimer]);

  const isFlipping = flipState === 'flipping';

  return {
    currentSpreadIndex,
    targetSpreadIndex,
    spreadIndex: currentSpreadIndex, // Backward-compatible alias
    direction,
    flipState,
    isFlipping,
    progress,
    canPrev: count > 0 && currentSpreadIndex > 0 && !isFlipping,
    canNext: count > 0 && currentSpreadIndex < maxIndex && !isFlipping,
    next,
    prev,
    goTo,
    onFlipEnd,
    duration,
  };
}

export default useBookFlip3D;
