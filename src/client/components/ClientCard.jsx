import { Archive, CalendarDays, MoreHorizontal, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dueStatus } from '../lib/format.js';
import { Amount } from './ui/Amount.jsx';
import { Progress, StatusBadge } from './ui/Data.jsx';
import { Menu } from './ui/Menu.jsx';

/**
 * Client summary card. The whole surface is clickable via a stretched link on
 * the title, which keeps the card's own menu button focusable and keeps the
 * accessible name down to the client's name rather than the entire card text.
 */
export function ClientCard({ client, onEdit, onArchive }) {
  const due = dueStatus(client.due_date);

  return (
    <article className="client-card">
      {/* Status sits left and actions right, so the row stays balanced now that
          the initials badge no longer anchors the left edge. */}
      <div className="client-card__top">
        <StatusBadge status={client.status} />
        <div className="client-card__actions">
          <Menu
            icon={MoreHorizontal}
            small
            label={`Actions for ${client.name}`}
            items={[
              { label: 'Edit client', icon: Pencil, onSelect: () => onEdit(client) },
              { divider: true },
              { label: 'Archive client', icon: Archive, danger: true, onSelect: () => onArchive(client) },
            ]}
          />
        </div>
      </div>

      {/* The project is the headline — it is what the team refers to day to day —
          with the client it belongs to as the supporting line. */}
      <div className="client-card__title">
        <h3 className="truncate">
          <Link className="client-card__link" to={`/clients/${client.id}`}>
            {client.project_name}
          </Link>
        </h3>
        <p className="truncate">{client.name}</p>
      </div>

      <div className="client-card__money">
        <div>
          <span>Paid</span>
          <strong><Amount value={client.total_paid} code={client.currency} /></strong>
        </div>
        <div>
          <span>Balance</span>
          <strong><Amount value={client.remaining_balance} code={client.currency} /></strong>
        </div>
      </div>

      <div className="client-card__progress">
        <div>
          <span>Project progress</span>
          <span>
            {client.completed_task_count}/{client.task_count} tasks
          </span>
        </div>
        <Progress value={client.progress} label={`${client.name} progress`} />
      </div>

      <div className="client-card__foot">
        <span
          className={
            due.tone === 'overdue'
              ? 'due-flag due-flag--overdue'
              : due.tone === 'soon'
                ? 'due-flag due-flag--soon'
                : 'due-flag'
          }
        >
          <CalendarDays size={13} aria-hidden="true" />
          {due.label}
        </span>
      </div>
    </article>
  );
}
