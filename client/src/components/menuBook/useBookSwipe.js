import { useCallback, useRef } from 'react';

/**
 * useBookSwipe
 *
 * Lightweight, fluid touch swipe gesture handler for mobile & tablet:
 * - Swipe left -> Next page (onSwipeLeft)
 * - Swipe right -> Previous page (onSwipeRight)
 * - Protects vertical page scrolling: cancels horizontal swipe if vertical
 *   scroll gesture is detected, avoiding interference with long menu lists.
 */
export function useBookSwipe({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 45,
  maxTimeMs = 700,
  enabled = true,
} = {}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isTracking = useRef(false);

  const onTouchStart = useCallback(
    (e) => {
      if (!enabled || e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
      isTracking.current = true;
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!isTracking.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // If vertical movement exceeds horizontal movement by a noticeable margin,
      // the user is scrolling the menu content vertically. Cancel swipe tracking.
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 18) {
        isTracking.current = false;
      }
    },
    []
  );

  const onTouchEnd = useCallback(
    (e) => {
      if (!isTracking.current) return;
      isTracking.current = false;

      const touch = e.changedTouches?.[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const duration = Date.now() - touchStartTime.current;

      const isFastEnough = duration <= maxTimeMs;
      const isLongEnough = Math.abs(deltaX) >= minDistance;
      const isHorizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

      if (isFastEnough && isLongEnough && isHorizontalDominant) {
        if (deltaX < 0) {
          // Swipe left -> Next
          onSwipeLeft?.();
        } else {
          // Swipe right -> Prev
          onSwipeRight?.();
        }
      }
    },
    [maxTimeMs, minDistance, onSwipeLeft, onSwipeRight]
  );

  const onTouchCancel = useCallback(() => {
    isTracking.current = false;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}

export default useBookSwipe;
