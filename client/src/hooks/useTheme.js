import { useCallback, useEffect, useState } from 'react';

// Customer site theme: 'dark' (default look) or 'light'.
// The attribute on <html> is the source of truth; index.html sets it before React renders.
const STORAGE_KEY = 'wp-theme';
const THEME_COLORS = { dark: '#06140e', light: '#f7f3e8' };

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (e) {
    return null;
  }
}

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch (e) {
    return 'dark';
  }
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

export default function useTheme() {
  const [theme, setThemeState] = useState(currentTheme);

  // With nothing stored, follow the OS preference live.
  useEffect(() => {
    if (readStored()) return undefined;
    let mql = null;
    const onChange = () => {
      const next = systemTheme();
      applyTheme(next);
      setThemeState(next);
    };
    try {
      mql = window.matchMedia('(prefers-color-scheme: light)');
      mql.addEventListener('change', onChange);
    } catch (e) {
      return undefined;
    }
    return () => mql && mql.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next) => {
    const value = next === 'light' ? 'light' : 'dark';
    applyTheme(value);
    setThemeState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* storage blocked: theme still applies for this page view */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme() === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
