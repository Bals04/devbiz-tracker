import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_KEY, THEME_MODES, applyTheme, storedTheme } from '../lib/theme.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(storedTheme);

  useEffect(() => {
    applyTheme(mode);
    try {
      window.localStorage.setItem(THEME_KEY, JSON.stringify(mode));
    } catch {
      /* Storage unavailable — the theme still applies for this session. */
    }
  }, [mode]);

  // Resolve "system" to a concrete value so the UI can show the real state.
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved]);

  const value = useMemo(
    () => ({ mode, resolved, setMode, toggle, modes: THEME_MODES }),
    [mode, resolved, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
