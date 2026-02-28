/**
 * useTheme Hook
 * Manages dark/light theme preference. When running as an HD child instance,
 * uses event branding themePreference as initial theme when the user has no
 * stored preference for this page (keyed by pageId).
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

const GLOBAL_THEME_KEY = 'hd26forge_theme';
const VALID_THEMES = ['light', 'dark', 'system'];

function getStoredTheme(key) {
  try {
    const stored = localStorage.getItem(key);
    if (stored && VALID_THEMES.includes(stored)) return stored;
  } catch {
    // localStorage not available
  }
  return null;
}

export function useTheme() {
  const { eventDefaultTheme, pageId } = useContext(ThemeContext);
  const themeKey = pageId ? `hd26forge_theme_${pageId}` : GLOBAL_THEME_KEY;

  const [theme, setThemeState] = useState(() => {
    const stored = getStoredTheme(GLOBAL_THEME_KEY);
    if (stored) return stored;
    return 'dark'; // VIBING design system defaults to dark mode
  });

  // When we get event context (pageId + eventDefaultTheme), apply instance default if no stored preference
  useEffect(() => {
    if (!pageId || themeKey === GLOBAL_THEME_KEY) return;
    const stored = getStoredTheme(themeKey);
    if (stored) {
      setThemeState(stored);
      return;
    }
    if (eventDefaultTheme && VALID_THEMES.includes(eventDefaultTheme)) {
      setThemeState(eventDefaultTheme);
    }
  }, [themeKey, pageId, eventDefaultTheme]);

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color-mode', resolvedTheme);
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    try {
      // Don't write to a per-page key when there's no stored value yet and we have an event default:
      // the apply-default effect will set the theme; writing here would persist 'dark' and block it.
      if (pageId && eventDefaultTheme && !getStoredTheme(themeKey) && theme !== eventDefaultTheme) {
        return;
      }
      localStorage.setItem(themeKey, theme);
    } catch {
      // ignore
    }
  }, [theme, themeKey, pageId, eventDefaultTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setThemeState('system');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (VALID_THEMES.includes(newTheme)) setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    resolvedTheme,
    isSystemTheme: theme === 'system',
    isDark: resolvedTheme === 'dark',
  };
}

export default useTheme;
