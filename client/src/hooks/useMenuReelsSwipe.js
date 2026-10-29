import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Menu <-> Reels pager that follows the finger.
 *
 * A sideways touch drag or two-finger trackpad swipe moves both screens in real time: the one
 * on screen slides with the finger and the other one comes in right behind it from the same
 * side. Let go past ~22% of the width (or with a quick flick) and it finishes; otherwise it
 * springs back. Works the same from Reels back to the menu.
 *
 * Positions are written straight to the two elements' style (no React render per frame).
 * At rest the elements carry no inline style and their classes decide the layout:
 *   menu:  `.menu-pager` (+ `.is-away` while Reels are open)
 *   reels: `.reels-pager` (+ `.is-open`)
 *
 * open(side) / close(side) run the same slide for buttons and keys; side -1 = content moves
 * left (the other screen comes in from the right), +1 = moves right.
 */
const SETTLE_MS = 280;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const COMMIT_RATIO = 0.22;
const FLICK_PX_PER_MS = 0.45;
const WHEEL_END_MS = 110;
const EXCLUDE = 'input, textarea, select, .category-bar-scroll, .comments-drawer, .ingredients-glass-card, [data-no-reels-swipe]';

export default function useMenuReelsSwipe({ isOpen, setOpen, setReelsPresent, menuRef, reelsRef, enabled }) {
  const st = useRef({ touch: null, wheel: null, animating: false, pendingClear: false, wheelQuietUntil: 0 });
  const openRef = useRef(isOpen);
  openRef.current = isOpen;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const width = () => window.innerWidth || 1;
  const nodes = () => [menuRef.current, reelsRef.current];

  // from: which screen the gesture started on. dx: finger offset. side: which edge the other
  // screen comes in from (-1 = right edge, +1 = left edge).
  const place = useCallback((from, dx, side) => {
    const [menu, reels] = nodes();
    const w = width();
    const moving = from === 'menu' ? menu : reels;
    const coming = from === 'menu' ? reels : menu;
    if (moving) {
      moving.style.transform = `translate3d(${dx}px,0,0)`;
      moving.style.visibility = 'visible';
    }
    if (coming) {
      // The incoming screen starts just past the screen edge and reaches its place as the drag
      // completes. On wide screens Reels are a centred phone-sized frame, so it only needs to
      // travel far enough to hide that frame (it peeks in as soon as the finger moves).
      const frame = coming === reels ? coming.firstElementChild : null;
      const travel = frame ? Math.min(w, (w + frame.offsetWidth) / 2 + 16) : w;
      const progress = Math.min(1, Math.abs(dx) / w);
      const offset = travel * (1 - progress) * (side < 0 ? 1 : -1);
      coming.style.transform = `translate3d(${offset}px,0,0)`;
      coming.style.visibility = 'visible';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTransition = (on) => {
    for (const el of nodes()) {
      if (!el) continue;
      el.style.transition = on ? `transform ${SETTLE_MS}ms ${EASE}` : 'none';
      el.style.willChange = 'transform';
    }
  };

  const clearInline = () => {
    for (const el of nodes()) {
      if (!el) continue;
      el.style.transform = '';
      el.style.visibility = '';
      el.style.transition = '';
      el.style.willChange = '';
    }
  };

  // Finish (commit) or spring back from the current offset
  const settle = useCallback((from, dx, side, commit) => {
    const s = st.current;
    s.animating = true;
    setTransition(true);
    const target = commit ? side * width() : 0;
    requestAnimationFrame(() => place(from, target, side));
    setTimeout(() => {
      s.animating = false;
      if (commit) {
        // Keep the final positions until React has applied the new classes (layout effect below)
        s.pendingClear = true;
        setOpen(from === 'menu');
      } else {
        clearInline();
        if (from === 'menu') setReelsPresent(false);
      }
    }, SETTLE_MS + 20);
  }, [place, setOpen, setReelsPresent]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const s = st.current;
    if (!s.pendingClear) return;
    s.pendingClear = false;
    clearInline();
    if (!isOpen) setReelsPresent(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buttons / keys: the same slide, from a standing start
  const slide = useCallback((from, side) => {
    const s = st.current;
    if (s.animating || s.touch || s.wheel) return;
    if (from === 'menu') setReelsPresent(true);
    let tries = 0;
    const start = () => {
      const [menu, reels] = nodes();
      if (!menu || !reels) {
        if (tries++ < 30) requestAnimationFrame(start);
        else setOpen(from === 'menu'); // overlay not ready: just switch
        return;
      }
      setTransition(false);
      place(from, 0, side);
      void reels.offsetWidth; // apply the start position before animating
      settle(from, 0, side, true);
    };
    requestAnimationFrame(start);
  }, [place, settle, setOpen, setReelsPresent]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useCallback((side = -1) => {
    if (!openRef.current) slide('menu', side);
  }, [slide]);
  const close = useCallback((side = 1) => {
    if (openRef.current) slide('reels', side);
  }, [slide]);

  useEffect(() => {
    const s = st.current;
    const excluded = (target) => Boolean(target?.closest?.(EXCLUDE));
    const clamp = (dx) => Math.max(-width(), Math.min(width(), dx));
    const velocity = (samples) => {
      const now = performance.now();
      const recent = samples.filter((p) => now - p.t < 100);
      if (recent.length < 2) return 0;
      const a = recent[0];
      const b = recent[recent.length - 1];
      return (b.x - a.x) / Math.max(1, b.t - a.t);
    };
    const shouldCommit = (dx, v) =>
      Math.abs(dx) > width() * COMMIT_RATIO || (Math.abs(v) > FLICK_PX_PER_MS && Math.sign(v) === Math.sign(dx));

    // ---- Touch ----
    const onTouchStart = (e) => {
      if (!enabledRef.current || s.animating || e.touches.length !== 1 || excluded(e.target)) return;
      const t = e.touches[0];
      s.touch = { x0: t.clientX, y0: t.clientY, lock: null, dx: 0, from: openRef.current ? 'reels' : 'menu', samples: [] };
    };
    const onTouchMove = (e) => {
      const g = s.touch;
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x0;
      const dy = t.clientY - g.y0;
      if (!g.lock) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        g.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
        if (g.lock === 'y') return;
        if (g.from === 'menu') setReelsPresent(true);
        setTransition(false);
      }
      if (g.lock !== 'x') return;
      if (e.cancelable) e.preventDefault(); // the page must not scroll while paging
      g.dx = clamp(dx);
      g.samples.push({ x: g.dx, t: performance.now() });
      if (g.samples.length > 12) g.samples.shift();
      place(g.from, g.dx, g.dx < 0 ? -1 : 1);
    };
    const onTouchEnd = () => {
      const g = s.touch;
      s.touch = null;
      if (!g || g.lock !== 'x') return;
      const side = g.dx < 0 ? -1 : 1;
      settle(g.from, g.dx, side, shouldCommit(g.dx, velocity(g.samples)));
    };

    // ---- Trackpad (two-finger sideways swipe arrives as horizontal wheel events) ----
    const endWheel = () => {
      const g = s.wheel;
      s.wheel = null;
      if (!g) return;
      clearTimeout(g.timer);
      const side = g.dx < 0 ? -1 : 1;
      settle(g.from, g.dx, side, shouldCommit(g.dx, velocity(g.samples)));
      // Ignore the rest of this swipe's momentum
      s.wheelQuietUntil = performance.now() + 450;
    };
    const onWheel = (e) => {
      const now = performance.now();
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!s.wheel) {
        if (!horizontal || e.ctrlKey || !enabledRef.current || excluded(e.target)) return;
        if (now < s.wheelQuietUntil) {
          s.wheelQuietUntil = now + 120; // still coasting from the last swipe
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (s.animating || Math.abs(e.deltaX) < 2) return;
        s.wheel = { from: openRef.current ? 'reels' : 'menu', dx: 0, samples: [], timer: 0 };
        if (s.wheel.from === 'menu') setReelsPresent(true);
        setTransition(false);
      }
      const g = s.wheel;
      if (e.cancelable) e.preventDefault(); // also stops the browser's back/forward swipe
      // Natural scrolling: fingers moving left give a positive deltaX
      g.dx = clamp(g.dx - e.deltaX);
      g.samples.push({ x: g.dx, t: now });
      if (g.samples.length > 12) g.samples.shift();
      place(g.from, g.dx, g.dx < 0 ? -1 : 1);
      clearTimeout(g.timer);
      if (Math.abs(g.dx) >= width() * 0.98) endWheel(); // pushed all the way: finish now
      else g.timer = setTimeout(endWheel, WHEEL_END_MS);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('wheel', onWheel);
      clearTimeout(s.wheel?.timer);
    };
  }, [place, settle, setReelsPresent]);

  return { open, close };
}
