import {
  ArrowRight, Banknote, BriefcaseBusiness, CircleDollarSign, Clock3, FolderKanban,
  TriangleAlert, UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource.js';
import { dueStatus, relativeTime, statusLabel } from '../lib/format.js';
import { Amount } from '../components/ui/Amount.jsx';
import { Alert, EmptyState, Skeleton, StatGridSkeleton } from '../components/ui/Feedback.jsx';
import { Progress, StatusBadge } from '../components/ui/Data.jsx';

/** Clients that need attention today: overdue, due within a week, or on hold. */
function atRisk(clients) {
  return clients
    .map((client) => ({ client, due: dueStatus(client.due_date) }))
    .filter(
      ({ client, due }) =>
        (due.tone === 'overdue' || due.tone === 'soon') && client.status !== 'completed' && client.status !== 'cancelled',
    )
    .sort((a, b) => String(a.client.due_date).localeCompare(String(b.client.due_date)))
    .slice(0, 5);
}

export function Dashboard() {
  const { data, loading, error } = useResource(['/dashboard/summary', '/clients', '/activity']);
  const [summary, clients, activity] = data ?? [null, [], []];

  const cards = [
    {
      label: 'Total clients',
      value: summary?.total_clients ?? 0,
      note: `${summary?.active_projects ?? 0} active right now`,
      icon: UsersRound,
      tone: 'brand',
    },
    {
      label: 'Active projects',
      value: summary?.active_projects ?? 0,
      note: 'In delivery',
      icon: BriefcaseBusiness,
      tone: 'info',
    },
    {
      label: 'Outstanding',
      value: <Amount value={summary?.outstanding_balance} compact />,
      note: 'Still to collect',
      icon: CircleDollarSign,
      tone: 'warn',
    },
    {
      label: 'Collected',
      value: <Amount value={summary?.collected_payments} compact />,
      note: 'Received to date',
      icon: Banknote,
      tone: 'violet',
    },
  ];

  const risks = atRisk(clients ?? []);

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Workspace overview</span>
          <h1>Good work starts with a clear view.</h1>
          <p>Keep client relationships, project health and payments moving forward.</p>
        </div>
        <div className="page-head__actions">
          <Link to="/clients" className="btn btn--primary">
            View all clients
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <StatGridSkeleton />
      ) : (
        <section className="stat-grid" aria-label="Workspace summary">
          {cards.map(({ label, value, note, icon: Icon, tone }) => (
            <article className="stat" key={label}>
              <span className={`stat__icon stat__icon--${tone}`} aria-hidden="true">
                <Icon size={19} />
              </span>
              <div className="stat__body">
                <span className="stat__label">{label}</span>
                <span className="stat__value">{value}</span>
                <span className="stat__note">{note}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="section split-grid">
        <section className="card card--pad">
          <div className="card__header">
            <div>
              <h2>Needs attention</h2>
              <p>Projects overdue or due within the next week</p>
            </div>
          </div>

          {loading ? (
            <div className="stack" style={{ gap: 'var(--sp-4)' }}>
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} height={52} radius="var(--r-md)" />
              ))}
            </div>
          ) : risks.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Nothing is slipping"
              description="No active project is overdue or due in the next seven days."
            />
          ) : (
            <ul className="stack" style={{ gap: 'var(--sp-3)' }}>
              {risks.map(({ client, due }) => (
                <li key={client.id}>
                  <Link
                    to={`/clients/${client.id}`}
                    className="payment-row"
                    style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <strong className="truncate">{client.project_name}</strong>
                      <span className="truncate">{client.name}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      <span className={due.tone === 'overdue' ? 'due-flag due-flag--overdue' : 'due-flag due-flag--soon'}>
                        <TriangleAlert size={13} aria-hidden="true" />
                        {due.label}
                      </span>
                      <StatusBadge status={client.status} />
                    </span>
                  </Link>
                  <div style={{ padding: '0 var(--sp-3)', marginTop: 'var(--sp-2)' }}>
                    <Progress value={client.progress} label={`${client.name} progress`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card--pad">
          <div className="card__header">
            <div>
              <h2>Recent activity</h2>
              <p>The latest changes across the workspace</p>
            </div>
          </div>

          {loading ? (
            <div className="stack" style={{ gap: 'var(--sp-3)' }}>
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} height={30} />
              ))}
            </div>
          ) : (activity ?? []).length === 0 ? (
            <EmptyState icon={Clock3} title="No activity yet" description="Changes across clients will show up here." />
          ) : (
            <ul className="activity">
              {activity.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <span className="activity__dot" aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <strong>{statusLabel(item.action.replace('.', ' '))}</strong>
                    <span className="truncate">
                      {item.client?.name ? `${item.client.name} · ` : ''}
                      {relativeTime(item.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="section">
        <div className="section__head">
          <div>
            <h2>Recent clients</h2>
            <p>Your most recently added engagements</p>
          </div>
          <Link to="/clients" className="link-btn">
            View all
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <Skeleton height={160} radius="var(--r-xl)" />
        ) : (clients ?? []).length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FolderKanban}
              title="Your client list is ready"
              description="Add your first client to start tracking work and payments."
              action={
                <Link to="/clients?new=1" className="btn btn--primary">
                  Add first client
                </Link>
              }
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Recently added clients</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col">Progress</th>
                  <th scope="col" className="num">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 6).map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link to={`/clients/${client.id}`} className="table__primary">
                        {client.project_name}
                      </Link>
                      <span className="table__sub">{client.name}</span>
                    </td>
                    <td>
                      <StatusBadge status={client.status} />
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <Progress value={client.progress} label={`${client.name} progress`} />
                    </td>
                    <td className="num"><Amount value={client.remaining_balance} code={client.currency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
