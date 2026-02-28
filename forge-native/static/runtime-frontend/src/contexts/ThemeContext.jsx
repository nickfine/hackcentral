/**
 * Theme context for event-scoped default theme (HD child instances).
 * When getEventPhase returns branding.themePreference, it is used as the
 * initial theme for this instance when the user has no stored preference.
 */

import { createContext } from 'react';
import { useTheme } from '../hooks/useTheme';

export const ThemeContext = createContext({
  eventDefaultTheme: null,
  pageId: null,
});

/** Provides theme state from useTheme() so theme is applied as soon as app mounts (including loading). */
export const ThemeStateContext = createContext(null);

export function ThemeStateProvider({ children }) {
  const value = useTheme();
  return (
    <ThemeStateContext.Provider value={value}>
      {children}
    </ThemeStateContext.Provider>
  );
}

export default ThemeContext;
