import { FolderKanban, LayoutGrid, Plus, Rows3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClientCard } from '../components/ClientCard.jsx';
import { ClientForm } from '../components/ClientForm.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Progress, StatusBadge } from '../components/ui/Data.jsx';
import { Alert, ClientGridSkeleton, EmptyState } from '../components/ui/Feedback.jsx';
import { FilterSelect, SearchInput, Segmented } from '../components/ui/Form.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounced, useLocalStorage } from '../hooks/useLocalStorage.js';
import { useResource } from '../hooks/useResource.js';
import { api } from '../lib/api.js';
import { dueStatus } from '../lib/format.js';
import { Amount } from '../components/ui/Amount.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'due', label: 'Due soonest' },
  { value: 'balance', label: 'Largest balance' },
  { value: 'name', label: 'Name A–Z' },
];

const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Rows3 },
];

const SORTERS = {
  recent: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
  name: (a, b) => a.name.localeCompare(b.name),
  balance: (a, b) => Number(b.remaining_balance) - Number(a.remaining_balance),
  // Clients with no due date sort last rather than colliding at the top.
  due: (a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
};

export function Clients() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useLocalStorage('devbiz.clients.sort', 'recent');
  const [view, setView] = useLocalStorage('devbiz.clients.view', 'grid');
  const [formClient, setFormClient] = useState(undefined);
  const [showForm, setShowForm] = useState(false);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  const debouncedQuery = useDebounced(query, 250);
  const { data: clients, loading, error, refresh } = useResource(
    `/clients${debouncedQuery ? `?search=${encodeURIComponent(debouncedQuery)}` : ''}`,
  );

  // The command palette links here with ?new=1 to open the create dialog.
  useEffect(() => {
    if (!params.get('new')) return;
    setFormClient(undefined);
    setShowForm(true);
    params.delete('new');
    setParams(params, { replace: true });
  }, [params, setParams]);

  const visible = useMemo(() => {
    const list = (clients ?? []).filter((client) => status === 'all' || client.status === status);
    return [...list].sort(SORTERS[sort] ?? SORTERS.recent);
  }, [clients, status, sort]);

  const save = async (input) => {
    await api(formClient ? `/clients/${formClient.id}` : '/clients', {
      method: formClient ? 'PATCH' : 'POST',
      body: JSON.stringify(input),
    });
    toast.success(formClient ? 'Client updated' : 'Client created', input.name);
    await refresh();
  };

  const confirmArchive = async () => {
    setArchiving(true);
    try {
      await api(`/clients/${pendingArchive.id}/archive`, { method: 'POST' });
      toast.success('Client archived', pendingArchive.name);
      setPendingArchive(null);
      await refresh();
    } catch (err) {
      toast.error('Could not archive client', err.message);
    } finally {
      setArchiving(false);
    }
  };

  const openCreate = () => {
    setFormClient(undefined);
    setShowForm(true);
  };

  const openEdit = (client) => {
    setFormClient(client);
    setShowForm(true);
  };

  const filtered = query || status !== 'all';

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Client portfolio</span>
          <h1>Clients</h1>
          <p>Every engagement, its delivery progress and what is still owed.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Add client
          </Button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search clients or projects" label="Search clients" />
        <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <FilterSelect label="Sort clients" value={sort} onChange={setSort} options={SORT_OPTIONS} />
        <div className="toolbar__spacer" />
        <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} label="Layout" />
      </div>

      <p className="muted" style={{ marginBottom: 'var(--sp-4)' }} aria-live="polite">
        {loading ? 'Loading clients…' : `${visible.length} client${visible.length === 1 ? '' : 's'}`}
      </p>

      {loading ? (
        <ClientGridSkeleton />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderKanban}
            title={filtered ? 'No matching clients' : 'Your client list is ready'}
            description={
              filtered
                ? 'Try a different search term or clear the status filter.'
                : 'Add your first client to start tracking work and payments.'
            }
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setQuery('');
                    setStatus('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" icon={Plus} onClick={openCreate}>
                  Add first client
                </Button>
              )
            }
          />
        </div>
      ) : view === 'grid' ? (
        <div className="client-grid">
          {visible.map((client) => (
            <ClientCard key={client.id} client={client} onEdit={openEdit} onArchive={setPendingArchive} />
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">All clients</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Status</th>
                <th scope="col">Progress</th>
                <th scope="col">Due</th>
                <th scope="col" className="num">
                  Paid
                </th>
                <th scope="col" className="num">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => {
                const due = dueStatus(client.due_date);
                return (
                  <tr
                    key={client.id}
                    className="table__row--link"
                    tabIndex={0}
                    // The whole row navigates, but a click that lands on a real
                    // control keeps its own behaviour rather than being
                    // swallowed by the row handler.
                    onClick={(event) => {
                      if (event.target.closest('a, button, input, select, textarea')) return;
                      navigate(`/clients/${client.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      navigate(`/clients/${client.id}`);
                    }}
                  >
                    <td>
                      <Link to={`/clients/${client.id}`} className="table__primary">
                        {client.project_name}
                      </Link>
                      <span className="table__sub">{client.name}</span>
                    </td>
                    <td>
                      <StatusBadge status={client.status} />
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <Progress value={client.progress} label={`${client.name} progress`} />
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
                    <td className="num"><Amount value={client.total_paid} code={client.currency} /></td>
                    <td className="num"><Amount value={client.remaining_balance} code={client.currency} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ClientForm client={formClient} onClose={() => setShowForm(false)} onSave={save} />}

      {pendingArchive && (
        <ConfirmDialog
          title="Archive this client?"
          message={`${pendingArchive.name} will be hidden from the client list. Their payments and tasks are kept, and the client can be restored from the database.`}
          confirmLabel="Archive client"
          destructive
          loading={archiving}
          onConfirm={confirmArchive}
          onClose={() => setPendingArchive(null)}
        />
      )}
    </>
  );
}
