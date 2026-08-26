/**
 * Keyboard shortcut matching, kept pure so it can be unit tested without a DOM.
 *
 * The `meta` option means "the platform's primary modifier", not the Command
 * key specifically: Cmd on macOS and Ctrl on Windows and Linux both satisfy it.
 * Browsers do not report which physical key was pressed in a portable way, so
 * treating metaKey and ctrlKey as equivalent is what makes one declaration work
 * on every platform. Only the on-screen label differs (see lib/platform.js).
 */

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

/** True when focus is somewhere the user is composing text. */
export function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return TYPING_TAGS.includes(target.tagName);
}

export function matchesHotkey(event, key, { meta = false, shift = false } = {}) {
  // An unmodified shortcut must never fire while someone is typing.
  if (!meta && !shift && isTypingTarget(event.target)) return false;

  if (String(event.key ?? '').toLowerCase() !== String(key).toLowerCase()) return false;

  // Cmd (macOS) and Ctrl (Windows/Linux) are interchangeable here.
  const primaryModifier = Boolean(event.metaKey || event.ctrlKey);
  if (meta !== primaryModifier) return false;

  return shift === Boolean(event.shiftKey);
}
