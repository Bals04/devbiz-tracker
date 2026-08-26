import { useEffect, useRef, useState } from 'react';
import { matchesHotkey } from '../lib/hotkey.js';

/**
 * State mirrored into localStorage. Every access is guarded: private windows,
 * cleared site data and storage-blocking browsers all throw rather than
 * returning null, and the app must still render correctly without it.
 */
export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? fallback : JSON.parse(stored);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage unavailable — the in-memory value is still correct. */
    }
  }, [key, value]);

  return [value, setValue];
}

/** Reads a stored value once, outside React, for pre-render setup. */
export function readStored(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

/** Debounces a rapidly-changing value (search boxes, filters). */
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Global keyboard shortcut. `meta: true` matches the platform's primary
 * modifier, so Ctrl+K and Cmd+K both fire the same handler — see
 * lib/hotkey.js, where the matching rules live and are unit tested.
 *
 * The handler is held in a ref and the effect depends only on primitives, so
 * passing an inline arrow function does not re-bind the listener every render.
 */
export function useHotkey(key, handler, { meta = false, shift = false } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!matchesHotkey(event, key, { meta, shift })) return;
      event.preventDefault();
      handlerRef.current(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, meta, shift]);
}
