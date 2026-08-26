import { readStored } from '../hooks/useLocalStorage.js';

export const THEME_KEY = 'devbiz.theme';
export const THEME_MODES = ['light', 'dark', 'system'];

/**
 * Writes the chosen mode to <html data-theme>. "system" removes the attribute
 * entirely so the stylesheet's prefers-color-scheme query takes over — which
 * is why no colour token is ever defined only inside a media query.
 */
export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export function storedTheme() {
  const stored = readStored(THEME_KEY, 'system');
  return THEME_MODES.includes(stored) ? stored : 'system';
}

/** Runs before React mounts so the first paint is already the right theme. */
export function initTheme() {
  applyTheme(storedTheme());
}
