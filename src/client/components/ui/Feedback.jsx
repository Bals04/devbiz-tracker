import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const ALERT_ICONS = { error: AlertTriangle, success: CheckCircle2, info: Info, warn: AlertTriangle };

/** Inline, in-context message. Transient feedback belongs in a toast instead. */
export function Alert({ type = 'error', children }) {
  const Icon = ALERT_ICONS[type] ?? AlertTriangle;
  return (
    <div className={`alert ${type === 'error' ? '' : `alert--${type}`}`.trim()} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ width, height = 14, radius, style, ...rest }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'block', width: width ?? '100%', height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}

/**
 * Loading placeholders that mirror the shape of the real content, so the page
 * does not reflow when data lands. Announced once as a single busy region.
 */
export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="stat-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: count }, (_, index) => (
        <div className="stat" key={index}>
          <Skeleton width={40} height={40} radius="var(--r-md)" />
          <div className="stat__body" style={{ flex: 1 }}>
            <Skeleton width="55%" height={11} />
            <Skeleton width="75%" height={22} style={{ marginTop: 'var(--sp-2)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientGridSkeleton({ count = 6 }) {
  return (
    <div className="client-grid" aria-busy="true" aria-label="Loading clients">
      {Array.from({ length: count }, (_, index) => (
        <div className="client-card" key={index}>
          <div className="client-card__top">
            <Skeleton width={38} height={38} radius="var(--r-md)" />
            <Skeleton width={64} height={18} radius="var(--r-full)" />
          </div>
          <div className="client-card__title">
            <Skeleton width="70%" height={16} />
            <Skeleton width="45%" height={12} style={{ marginTop: 'var(--sp-2)' }} />
          </div>
          <div className="client-card__money">
            <Skeleton height={30} />
            <Skeleton height={30} />
          </div>
          <Skeleton height={6} radius="var(--r-full)" />
          <div className="client-card__foot">
            <Skeleton width="40%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading table">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: columns }, (_, column) => (
                <td key={column}>
                  <Skeleton width={column === 0 ? '80%' : '55%'} height={12} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
