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

/**
 * Dish-page turn durations.
 *
 * Tapping a dish turns a single leaf (the right-hand page) rather than a whole
 * spread, so it is deliberately quicker than the spread turn above: fast enough
 * to feel like a flick of the wrist, slow enough to still read as paper.
 * Must stay in sync with --mbd-flip-dur / --mbd-flip-back-dur in
 * styles/menu-book-detail.css.
 */
export const DISH_FLIP_IN_MS = 470;
export const DISH_FLIP_OUT_MS = 430;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const prefersReducedMotion = () => {
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

/**
 * useReducedMotion
 *
 * Live `prefers-reduced-motion: reduce` subscription, so toggling the OS
 * setting takes effect without a reload.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    let mq;
    try {
      mq = window.matchMedia(REDUCED_MOTION_QUERY);
    } catch {
      return undefined;
    }
    const sync = (event) => setReduced(Boolean(event.matches));
    setReduced(Boolean(mq.matches));
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    if (typeof mq.addListener === 'function') {
      mq.addListener(sync);
      return () => mq.removeListener(sync);
    }
    return undefined;
  }, []);

  return reduced;
}

/**
 * useDishPageFlip
 *
 * Drives the single-leaf paper turn that opens and closes a dish page.
 *
 * Phases:
 *   'turning-in'  - a leaf is swinging off the page, revealing the dish page.
 *   'open'        - the dish page is settled and fully interactive.
 *   'turning-out' - a leaf is swinging back over the dish page; `onBack` fires
 *                   as it lands, so the menu list appears under a covered page
 *                   instead of popping in.
 *
 * With `prefers-reduced-motion: reduce` there is no leaf at all: the dish page
 * is 'open' immediately and `onBack` fires synchronously.
 *
 * @param {object}   options
 * @param {*}        options.dishKey     Changing this restarts the opening turn.
 * @param {function} options.onBack      Called once the closing turn lands.
 * @param {number}   [options.inDuration]
 * @param {number}   [options.outDuration]
 */
export function useDishPageFlip({
  dishKey,
  onBack,
  inDuration = DISH_FLIP_IN_MS,
  outDuration = DISH_FLIP_OUT_MS,
} = {}) {
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 'open' : 'turning-in'));
  // Bumped on every turn so React remounts the leaf and the CSS animation
  // restarts from 0 even when two dishes are opened back to back.
  const [turnId, setTurnId] = useState(0);

  const inTimer = useRef(null);
  const outTimer = useRef(null);
  const closingRef = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Open (or re-open, for a different dish) with a fresh inward turn.
  useEffect(() => {
    closingRef.current = false;
    clearTimeout(inTimer.current);
    clearTimeout(outTimer.current);

    if (reduced || inDuration <= 0) {
      setPhase('open');
      return undefined;
    }

    setTurnId((id) => id + 1);
    setPhase('turning-in');
    inTimer.current = setTimeout(() => setPhase('open'), inDuration);
    return () => clearTimeout(inTimer.current);
  }, [dishKey, reduced, inDuration]);

  const requestBack = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimeout(inTimer.current);

    if (reduced || outDuration <= 0) {
      onBackRef.current?.();
      return;
    }

    setTurnId((id) => id + 1);
    setPhase('turning-out');
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => {
      onBackRef.current?.();
    }, outDuration);
  }, [reduced, outDuration]);

  useEffect(() => () => {
    clearTimeout(inTimer.current);
    clearTimeout(outTimer.current);
  }, []);

  return {
    phase,
    turnId,
    reduced,
    requestBack,
    isTurning: phase !== 'open',
    isClosing: phase === 'turning-out',
    /** 'in' | 'out' | null - direction of the leaf currently on screen. */
    turnDirection: phase === 'turning-in' ? 'in' : phase === 'turning-out' ? 'out' : null,
    inDuration,
    outDuration,
  };
}

export default useBookFlip3D;
