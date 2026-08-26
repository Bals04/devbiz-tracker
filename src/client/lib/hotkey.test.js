import { describe, expect, it } from 'vitest';
import { isTypingTarget, matchesHotkey } from './hotkey.js';

const event = (overrides = {}) => ({
  key: 'k',
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  target: null,
  ...overrides,
});

const PALETTE = { meta: true };

describe('the command palette shortcut', () => {
  it('fires on Ctrl+K, for Windows and Linux', () => {
    expect(matchesHotkey(event({ ctrlKey: true }), 'k', PALETTE)).toBe(true);
  });

  it('fires on Cmd+K, for macOS', () => {
    expect(matchesHotkey(event({ metaKey: true }), 'k', PALETTE)).toBe(true);
  });

  it('is case insensitive, so Caps Lock still works', () => {
    expect(matchesHotkey(event({ key: 'K', ctrlKey: true }), 'k', PALETTE)).toBe(true);
  });

  it('does not fire on K alone', () => {
    expect(matchesHotkey(event(), 'k', PALETTE)).toBe(false);
  });

  it('does not fire on a different key with the modifier held', () => {
    expect(matchesHotkey(event({ key: 'j', ctrlKey: true }), 'k', PALETTE)).toBe(false);
  });

  it('still fires while the user is typing in a field', () => {
    const target = { tagName: 'INPUT' };
    expect(matchesHotkey(event({ ctrlKey: true, target }), 'k', PALETTE)).toBe(true);
  });

  it('ignores a stray Shift', () => {
    expect(matchesHotkey(event({ ctrlKey: true, shiftKey: true }), 'k', PALETTE)).toBe(false);
  });
});

describe('unmodified shortcuts', () => {
  it('fire when focus is not in a text field', () => {
    expect(matchesHotkey(event({ key: 'n', target: { tagName: 'DIV' } }), 'n')).toBe(true);
  });

  it('are suppressed while typing, so letters are not swallowed', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(matchesHotkey(event({ key: 'n', target: { tagName } }), 'n')).toBe(false);
    }
  });

  it('are suppressed in contenteditable regions', () => {
    const target = { tagName: 'DIV', isContentEditable: true };
    expect(matchesHotkey(event({ key: 'n', target }), 'n')).toBe(false);
  });

  it('do not fire when a modifier is held', () => {
    expect(matchesHotkey(event({ key: 'n', ctrlKey: true }), 'n')).toBe(false);
  });
});

describe('isTypingTarget', () => {
  it('handles a missing target', () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
  });
});
