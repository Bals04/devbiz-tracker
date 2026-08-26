import { describe, expect, it } from 'vitest';
import { currency, dueStatus, initials, statusLabel } from './format.js';

/**
 * Builds a yyyy-mm-dd string from local date parts. toISOString() would convert
 * to UTC first, which shifts the date backwards in +08:00 and would make these
 * assertions fail depending on the time of day.
 */
const dateOffsetByDays = (offset) => {
  const target = new Date();
  target.setDate(target.getDate() + offset);
  const pad = (part) => String(part).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
};

describe('format helpers', () => {
  it('formats Philippine peso values', () => expect(currency(12500)).toContain('12,500'));
  it('creates short avatar initials', () => expect(initials('DevBiz Studio')).toBe('DS'));
  it('creates readable status labels', () => expect(statusLabel('on_hold')).toBe('On Hold'));
});

describe('dueStatus labels', () => {
  it('says "Due today" on the due date', () => {
    expect(dueStatus(dateOffsetByDays(0))).toEqual({ tone: 'soon', label: 'Due today' });
  });

  it('says "Due tomorrow" rather than "Due in 1 day"', () => {
    expect(dueStatus(dateOffsetByDays(1))).toEqual({ tone: 'soon', label: 'Due tomorrow' });
  });

  it('pluralises the days remaining', () => {
    expect(dueStatus(dateOffsetByDays(3)).label).toBe('Due in 3 days');
  });

  it('uses the singular for one day overdue', () => {
    expect(dueStatus(dateOffsetByDays(-1))).toEqual({ tone: 'overdue', label: 'Overdue by 1 day' });
  });

  it('pluralises multiple days overdue', () => {
    expect(dueStatus(dateOffsetByDays(-5)).label).toBe('Overdue by 5 days');
  });

  it('falls back to an absolute date beyond a week out', () => {
    const result = dueStatus(dateOffsetByDays(30));
    expect(result.tone).toBe('ok');
    expect(result.label.startsWith('Due ')).toBe(true);
  });

  it('handles a missing due date', () => {
    expect(dueStatus(null)).toEqual({ tone: 'none', label: 'No due date' });
  });
});
