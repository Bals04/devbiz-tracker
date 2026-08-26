/**
 * Platform detection, used only to label keyboard shortcuts correctly.
 *
 * The shortcut handlers themselves accept either Cmd or Ctrl on every platform
 * (see useHotkey), so this never gates behaviour — it only decides whether the
 * hint reads "⌘K" or "Ctrl K". Showing a Mac glyph to a Windows user is a real
 * usability bug even when the shortcut works.
 *
 * navigator.platform is deprecated but still the most reliable signal here, so
 * userAgentData is preferred where available and the UA string is the fallback.
 */
const platformString = () => {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
};

export const isMac = /mac|iphone|ipad|ipod/i.test(platformString());

/** The viewer's own modifier: "⌘" on Apple platforms, "Ctrl" everywhere else. */
export const modKeyLabel = isMac ? '⌘' : 'Ctrl';

/** The other platform's modifier, for hints that spell out both. */
export const altModKeyLabel = isMac ? 'Ctrl' : '⌘';

/** Names the other platform, so a hint can say which key belongs to it. */
export const altPlatformName = isMac ? 'Windows' : 'macOS';
