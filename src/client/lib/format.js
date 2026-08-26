const LOCALE = 'en-PH';

export const currency = (value, code = 'PHP') => new Intl.NumberFormat(LOCALE, {
  style: 'currency', currency: code, maximumFractionDigits: 0,
}).format(Number(value || 0));

/** Compact form for stat tiles, where a full peso figure would overflow. */
export const currencyCompact = (value, code = 'PHP') => {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 100000) return currency(amount, code);
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency', currency: code, notation: 'compact', maximumFractionDigits: 1,
  }).format(amount);
};

export const date = (value) => value ? new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'No date';

export const dateTime = (value) => value ? new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '';

export const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export const statusLabel = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const RELATIVE = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const DIVISIONS = [
  [60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.34524, 'week'], [12, 'month'], [Infinity, 'year'],
];

/** "3 days ago" / "in 2 weeks" — easier to scan than a timestamp in a feed. */
export const relativeTime = (value) => {
  if (!value) return '';
  let amount = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [span, unit] of DIVISIONS) {
    if (Math.abs(amount) < span) return RELATIVE.format(Math.round(amount), unit);
    amount /= span;
  }
  return '';
};

/** Whole days from today to a yyyy-mm-dd date. Negative means overdue. */
export const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

/**
 * Classifies a due date so cards, tables and the dashboard all colour urgency
 * the same way instead of each view inventing its own threshold.
 */
export const dueStatus = (value) => {
  const days = daysUntil(value);
  if (days === null) return { tone: 'none', label: 'No due date' };

  if (days < 0) {
    const late = Math.abs(days);
    return { tone: 'overdue', label: late === 1 ? 'Overdue by 1 day' : `Overdue by ${late} days` };
  }
  if (days === 0) return { tone: 'soon', label: 'Due today' };
  if (days === 1) return { tone: 'soon', label: 'Due tomorrow' };
  if (days <= 7) return { tone: 'soon', label: `Due in ${days} days` };
  return { tone: 'ok', label: `Due ${date(value)}` };
};
