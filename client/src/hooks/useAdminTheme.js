import { useCallback, useEffect, useState } from 'react';

// Admin-only theme. Independent of the customer site's 'wp-theme' key.
// Saved choice in localStorage wins; with nothing saved, follow the OS preference live.
export const ADMIN_THEME_STORAGE_KEY = 'smartdine_admin_theme';

function readStored() {
  try {
    const value = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
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

// Non-hook helper, e.g. for the login gate which renders before the dashboard state exists.
export function resolveAdminTheme() {
  if (typeof window === 'undefined') return 'dark';
  return readStored() || systemTheme();
}

export default function useAdminTheme() {
  const [theme, setThemeState] = useState(resolveAdminTheme);

  // Follow the OS preference only while the user has not chosen a theme.
  useEffect(() => {
    if (readStored()) return undefined;
    let mql = null;
    const onChange = () => setThemeState(systemTheme());
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
    setThemeState(value);
    try {
      window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, value);
    } catch (e) {
      /* storage blocked: theme still applies for this view */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const value = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, value);
      } catch (e) {
        /* storage blocked */
      }
      return value;
    });
  }, []);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}
