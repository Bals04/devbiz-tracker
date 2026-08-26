import { CalendarDays, CheckCircle2, ListChecks, MessageSquare, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AssigneeList, PriorityChip } from '../components/ui/Data.jsx';
import { Alert, EmptyState, StatGridSkeleton, TableSkeleton } from '../components/ui/Feedback.jsx';
import { FilterSelect, SearchInput } from '../components/ui/Form.jsx';
import { useDebounced, useLocalStorage } from '../hooks/useLocalStorage.js';
import { useResource } from '../hooks/useResource.js';
import { daysUntil, dueStatus } from '../lib/format.js';

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATE_OPTIONS = [
  { value: 'open', label: 'Open tasks' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'week', label: 'Due this week' },
  { value: 'done', label: 'Completed' },
  { value: 'all', label: 'All tasks' },
];

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

export function Tasks() {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [state, setState] = useLocalStorage('devbiz.tasks.state', 'open');
  const [assignee, setAssignee] = useState('all');
  const debouncedQuery = useDebounced(query, 200);

  const { data, loading, error } = useResource(['/tasks', '/team-members']);
  const [tasks, members] = data ?? [[], []];

  const assigneeOptions = useMemo(
    () => [
      { value: 'all', label: 'Everyone' },
      { value: 'none', label: 'Unassigned' },
      ...(members ?? []).map((member) => ({ value: member.id, label: member.name })),
    ],
    [members],
  );

  const visible = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();

    return (tasks ?? [])
      .filter((task) => {
        // Archived clients should not clutter the workspace-wide list.
        if (task.client?.archived_at) return false;

        const done = Boolean(task.column?.is_completed);
        const days = daysUntil(task.due_date);

        if (state === 'open' && done) return false;
        if (state === 'done' && !done) return false;
        if (state === 'overdue' && (done || days === null || days >= 0)) return false;
        if (state === 'week' && (done || days === null || days < 0 || days > 7)) return false;

        if (priority !== 'all' && task.priority !== priority) return false;

        if (assignee !== 'all') {
          const ids = (task.assignees ?? []).map((item) => item.team_member.id);
          if (assignee === 'none' ? ids.length > 0 : !ids.includes(assignee)) return false;
        }

        if (!term) return true;
        return (
          task.title.toLowerCase().includes(term) ||
          task.client?.name?.toLowerCase().includes(term) ||
          task.description?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        // Undated work sinks below anything with a deadline, then by priority.
        const dueDiff = (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
        if (dueDiff !== 0) return dueDiff;
        return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      });
  }, [tasks, state, priority, assignee, debouncedQuery]);

  const live = (tasks ?? []).filter((task) => !task.client?.archived_at);
  const open = live.filter((task) => !task.column?.is_completed);
  const overdue = open.filter((task) => {
    const days = daysUntil(task.due_date);
    return days !== null && days < 0;
  });
  const dueSoon = open.filter((task) => {
    const days = daysUntil(task.due_date);
    return days !== null && days >= 0 && days <= 7;
  });

  const cards = [
    { label: 'Open tasks', value: open.length, icon: ListChecks, tone: 'brand' },
    { label: 'Overdue', value: overdue.length, icon: TriangleAlert, tone: overdue.length ? 'danger' : 'info' },
    { label: 'Due this week', value: dueSoon.length, icon: CalendarDays, tone: 'warn' },
    { label: 'Completed', value: live.length - open.length, icon: CheckCircle2, tone: 'violet' },
  ];

  const filtered = query || priority !== 'all' || assignee !== 'all' || state !== 'open';

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Delivery</span>
          <h1>Tasks</h1>
          <p>Every task across every client board, sorted by what is due first.</p>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? <StatGridSkeleton /> : (
        <section className="stat-grid" aria-label="Task summary">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <article className="stat" key={label}>
              <span className={`stat__icon stat__icon--${tone}`} aria-hidden="true">
                <Icon size={19} />
              </span>
              <div className="stat__body">
                <span className="stat__label">{label}</span>
                <span className="stat__value">{value}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="toolbar" style={{ marginTop: 'var(--sp-6)' }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search tasks or clients" label="Search tasks" />
        <FilterSelect label="Filter by state" value={state} onChange={setState} options={STATE_OPTIONS} />
        <FilterSelect label="Filter by priority" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
        <FilterSelect label="Filter by assignee" value={assignee} onChange={setAssignee} options={assigneeOptions} />
      </div>

      <p className="muted" style={{ marginBottom: 'var(--sp-4)' }} aria-live="polite">
        {loading ? 'Loading tasks…' : `${visible.length} task${visible.length === 1 ? '' : 's'}`}
      </p>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ListChecks}
            title={filtered ? 'No matching tasks' : 'No open tasks'}
            description={
              filtered
                ? 'Try a different filter combination or clear the search.'
                : 'Tasks created on any client board show up here.'
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">All tasks across clients</caption>
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Client</th>
                <th scope="col">Column</th>
                <th scope="col">Priority</th>
                <th scope="col">Due</th>
                <th scope="col">Assignees</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((task) => {
                const due = dueStatus(task.due_date);
                const people = (task.assignees ?? []).map((item) => item.team_member);

                return (
                  <tr key={task.id}>
                    <td style={{ maxWidth: 340 }}>
                      <span className="table__primary">{task.title}</span>
                      {task.comments?.length > 0 && (
                        <span className="table__sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MessageSquare size={11} aria-hidden="true" />
                          {task.comments.length} comment{task.comments.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td>
                      {task.client ? (
                        <Link to={`/clients/${task.client.id}`} className="table__primary">
                          {task.client.name}
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={task.column?.is_completed ? 'badge badge--success' : 'badge'}>
                        {task.column?.name ?? 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <PriorityChip priority={task.priority} />
                    </td>
                    <td>
                      <span
                        className={
                          due.tone === 'overdue'
                            ? 'due-flag due-flag--overdue'
                            : due.tone === 'soon'
                              ? 'due-flag due-flag--soon'
                              : 'due-flag'
                        }
                      >
                        {due.label}
                      </span>
                    </td>
                    <td>
                      {people.length ? <AssigneeList people={people} max={3} /> : <span className="muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
