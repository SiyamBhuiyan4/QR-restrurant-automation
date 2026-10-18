import { useCallback, useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const STORAGE_KEY = 'menubook_perspective_mode';

const prefersReducedMotion = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches
    );
  } catch {
    return false;
  }
};

const hasHoverPointer = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  } catch {
    return false;
  }
};

/**
 * useBookParallax
 *
 * Smooth 3D tilt and perspective controller for the menu book:
 * - Provides interactive view toggle: '3d' (tabletop perspective) vs 'flat' (straight-on reading)
 * - In 3D mode: mouse movement creates subtle, smooth 3D tilt
 *   (rotateX between 6deg and 14deg, rotateY between -3deg and +3deg)
 * - requestAnimationFrame with damping interpolation (lerp) for 60-120fps motion
 * - Respects prefers-reduced-motion (disables parallax and settles instantly)
 * - Smoothly glides back to rest angle on mouse leave or view change
 */
export function useBookParallax({
  enabled = true,
  baseRotateX = 10,
  minRotateX = 6,
  maxRotateX = 14,
  minRotateY = -3,
  maxRotateY = 3,
  lerpFactor = 0.08,
} = {}) {
  const containerRef = useRef(null);

  const [viewMode, setViewModeState] = useState(() => {
    if (typeof window === 'undefined') return '3d';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === '3d' || saved === 'flat') return saved;
    } catch {
      // ignore storage errors
    }
    return '3d';
  });

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const setViewMode = useCallback((mode) => {
    const nextMode = mode === 'flat' ? 'flat' : '3d';
    setViewModeState(nextMode);
    try {
      localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewModeRef.current === '3d' ? 'flat' : '3d');
  }, [setViewMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return undefined;

    const reducedMotion = prefersReducedMotion();
    const canHover = hasHoverPointer();

    // In flat mode or reduced motion, target is flat (0deg, 0deg)
    const getRestTargets = (mode) => {
      if (mode === 'flat' || reducedMotion) {
        return { targetRx: 0, targetRy: 0 };
      }
      return { targetRx: baseRotateX, targetRy: 0 };
    };

    let { targetRx, targetRy } = getRestTargets(viewMode);
    let currentRx = targetRx;
    let currentRy = targetRy;
    let animId = null;
    let isRunning = false;

    const applyStyles = (rx, ry, glowX = 50, glowY = 50) => {
      el.style.setProperty('--mb-tilt-rx', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--mb-tilt-ry', `${ry.toFixed(2)}deg`);
      el.style.setProperty('--mb-glow-x', `${glowX.toFixed(1)}%`);
      el.style.setProperty('--mb-glow-y', `${glowY.toFixed(1)}%`);
    };

    // Initialize CSS variables immediately
    applyStyles(currentRx, currentRy);

    const step = () => {
      if (reducedMotion) {
        applyStyles(targetRx, targetRy);
        isRunning = false;
        return;
      }

      const diffX = targetRx - currentRx;
      const diffY = targetRy - currentRy;

      if (Math.abs(diffX) > 0.005 || Math.abs(diffY) > 0.005) {
        currentRx += diffX * lerpFactor;
        currentRy += diffY * lerpFactor;
        applyStyles(currentRx, currentRy);
        animId = requestAnimationFrame(step);
      } else {
        currentRx = targetRx;
        currentRy = targetRy;
        applyStyles(currentRx, currentRy);
        isRunning = false;
      }
    };

    const kickLoop = () => {
      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(step);
      }
    };

    // If viewMode changes, smoothly lerp to new rest target
    const rest = getRestTargets(viewMode);
    targetRx = rest.targetRx;
    targetRy = rest.targetRy;
    kickLoop();

    // Mouse movement handlers (only active if device supports fine hover)
    const handleMouseMove = (e) => {
      if (viewModeRef.current !== '3d' || reducedMotion || !canHover) return;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // Calculate tilt within specified bounds:
      // normY: 0 (top) -> minRotateX (6deg), 1 (bottom) -> maxRotateX (14deg)
      // normX: 0 (left) -> minRotateY (-3deg), 1 (right) -> maxRotateY (+3deg)
      targetRx = minRotateX + normY * (maxRotateX - minRotateX);
      targetRy = minRotateY + normX * (maxRotateY - minRotateY);

      kickLoop();
    };

    const handleMouseLeave = () => {
      if (reducedMotion) return;
      const r = getRestTargets(viewModeRef.current);
      targetRx = r.targetRx;
      targetRy = r.targetRy;
      kickLoop();
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [
    enabled,
    viewMode,
    baseRotateX,
    minRotateX,
    maxRotateX,
    minRotateY,
    maxRotateY,
    lerpFactor,
  ]);

  return {
    containerRef,
    viewMode,
    setViewMode,
    toggleViewMode,
    is3D: viewMode === '3d',
  };
}

export default useBookParallax;
