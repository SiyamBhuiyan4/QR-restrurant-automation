import { useEffect, useRef } from 'react';

const CHORD_TIMEOUT_MS = 1200;

function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tag = (target.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
}

/**
 * Admin keyboard shortcuts.
 *
 * - `g` followed by a key within ~1.2s navigates (see `chords` map).
 * - `/` calls `onFocusSearch` (if provided).
 *
 * Ignored while typing in form fields and when Ctrl/Cmd/Alt are held,
 * so it never fights with browser or input shortcuts.
 *
 * @param {{ chords: Record<string, () => void>, onFocusSearch?: () => void, enabled?: boolean }} options
 */
export default function useAdminShortcuts({ chords = {}, onFocusSearch = null, enabled = true } = {}) {
  const chordsRef = useRef(chords);
  const searchRef = useRef(onFocusSearch);
  chordsRef.current = chords;
  searchRef.current = onFocusSearch;

  useEffect(() => {
    if (!enabled) return undefined;

    let awaitingChord = false;
    let timer = null;

    const reset = () => {
      awaitingChord = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';

      if (awaitingChord) {
        reset();
        const action = chordsRef.current[key];
        if (action) {
          e.preventDefault();
          action();
        }
        return;
      }

      if (key === 'g' && !e.shiftKey) {
        awaitingChord = true;
        timer = setTimeout(reset, CHORD_TIMEOUT_MS);
        return;
      }

      if (key === '/' && searchRef.current) {
        e.preventDefault();
        searchRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      reset();
    };
  }, [enabled]);
}
