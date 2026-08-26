import { initials } from '../../lib/format.js';

const STATUS_TONE = {
  lead: 'info',
  active: 'brand',
  on_hold: 'warn',
  completed: 'success',
  cancelled: 'danger',
};

export function Badge({ tone = 'neutral', plain = false, children }) {
  const classes = [
    'badge',
    tone !== 'neutral' ? `badge--${tone}` : '',
    plain ? 'badge--plain' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={classes}>{children}</span>;
}

/** Client/project status, always mapped through one shared tone table. */
export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{String(status).replace('_', ' ')}</Badge>;
}

export function PriorityChip({ priority }) {
  return <span className={`chip chip--${priority}`}>{priority}</span>;
}

export function CountPill({ children }) {
  return <span className="count-pill">{children}</span>;
}

export function Avatar({ name, color, size = 'md' }) {
  const classes = ['avatar', size === 'sm' ? 'avatar--sm' : '', size === 'lg' ? 'avatar--lg' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} style={{ backgroundColor: color || 'var(--brand)' }} title={name}>
      {initials(name)}
    </span>
  );
}

/**
 * Assignees shown as avatar + name rather than initials alone. Initials are
 * ambiguous the moment two people share one (and unreadable to anyone who has
 * not memorised the team), so the name is spelled out. Tags wrap onto a second
 * line in narrow containers like a Kanban column.
 */
export function AssigneeList({ people = [], max = 3 }) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

  return (
    <span className="assignee-list">
      {shown.map((person) => (
        <span className="assignee-tag" key={person.id}>
          <Avatar name={person.name} color={person.avatar_color} size="sm" />
          <span className="truncate">{person.name}</span>
        </span>
      ))}
      {extra > 0 && (
        <span
          className="assignee-tag assignee-tag--more"
          title={people.slice(max).map((person) => person.name).join(', ')}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/**
 * Progress bar. The fill is scaled rather than resized, so `--progress` carries
 * a 0–1 ratio while the ARIA attributes carry the human-facing percentage.
 */
export function Progress({ value = 0, large = false, label = 'Progress' }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`progress ${large ? 'progress--lg' : ''}`.trim()}>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span className="progress__fill" style={{ '--progress': percent / 100 }} />
      </div>
      <span className="progress__value">{percent}%</span>
    </div>
  );
}
