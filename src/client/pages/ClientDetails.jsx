import {
  Banknote, CalendarClock, CheckCircle2, CircleDollarSign, Clock3,
  Mail, MapPin, Pencil, Phone, Plus, ReceiptText, StickyNote,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { ClientForm } from '../components/ClientForm.jsx';
import { KanbanBoard } from '../components/KanbanBoard.jsx';
import { PaymentForm } from '../components/PaymentForm.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Progress, StatusBadge } from '../components/ui/Data.jsx';
import { Alert, EmptyState, Skeleton, StatGridSkeleton } from '../components/ui/Feedback.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { api } from '../lib/api.js';
import { currency, date, relativeTime, statusLabel } from '../lib/format.js';
import { Amount } from '../components/ui/Amount.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Board' },
  { id: 'payments', label: 'Payments' },
  { id: 'activity', label: 'Activity' },
];

export function ClientDetails() {
  const { id } = useParams();
  const { setCrumbLabel } = useOutletContext() ?? {};
  const [tab, setTab] = useState('overview');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const toast = useToast();

  const { data, loading, error, refresh } = useResource([
    `/clients/${id}`,
    `/clients/${id}/payments`,
    `/clients/${id}/board`,
    '/team-members',
    `/clients/${id}/activity`,
  ]);

  const [client, payments, board, members, activity] = data ?? [];
  // The breadcrumb mirrors the page heading, which is the project name.
  const crumbLabel = client?.project_name;

  // Feeds the breadcrumb in the shell once the project is known. This
  // must be an effect: setting shell state during render would loop.
  useEffect(() => {
    if (crumbLabel) setCrumbLabel?.(crumbLabel);
  }, [crumbLabel, setCrumbLabel]);

  if (loading) {
    return (
      <>
        <Skeleton width={220} height={30} />
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <StatGridSkeleton />
        </div>
      </>
    );
  }

  if (error) return <Alert>{error}</Alert>;
  if (!client) return <Alert>Client not found.</Alert>;

  const savePayment = async (input) => {
    await api(`/clients/${id}/payments`, { method: 'POST', body: JSON.stringify(input) });
    toast.success('Payment recorded', currency(input.amount, client.currency));
    await refresh();
  };

  const saveClient = async (input) => {
    await api(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
    toast.success('Client updated', input.name);
    await refresh();
  };

  const cards = [
    { label: 'Contract value', value: <Amount value={client.contract_price} code={client.currency} />, icon: Banknote, tone: 'brand' },
    { label: 'Total collected', value: <Amount value={client.total_paid} code={client.currency} />, icon: CheckCircle2, tone: 'info' },
    {
      label: 'Remaining balance',
      value: <Amount value={client.remaining_balance} code={client.currency} />,
      icon: CircleDollarSign,
      tone: Number(client.remaining_balance) > 0 ? 'warn' : 'brand',
    },
    { label: 'Project due', value: date(client.due_date), icon: CalendarClock, tone: 'violet' },
  ];

  return (
    <>
      <header className="detail-head">
        <div style={{ minWidth: 0 }}>
          {/* Project leads, client supports — matching the listings this page
              is reached from. */}
          <div className="detail-head__title">
            <h1>{client.project_name}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="muted" style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-md)' }}>
            {client.name}
          </p>
        </div>
        <div className="detail-head__actions" style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <Button icon={Pencil} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => setPaymentOpen(true)}>
            Record payment
          </Button>
        </div>
      </header>

      <section className="stat-grid" aria-label="Project financials">
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

      <section className="card card--pad" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="spread" style={{ marginBottom: 'var(--sp-4)', alignItems: 'flex-end' }}>
          <div>
            <span className="eyebrow">Overall progress</span>
            <h2 style={{ marginTop: 'var(--sp-1)' }}>{client.progress}% complete</h2>
          </div>
          <span className="muted">
            {client.completed_task_count} of {client.task_count} tasks completed
          </span>
        </div>
        <Progress value={client.progress} large label="Overall project progress" />
      </section>

      <div className="section">
        <div className="tabs" role="tablist" aria-label="Client sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          tabIndex={0}
          style={{ marginTop: 'var(--sp-5)' }}
        >
          {tab === 'overview' && (
            <div className="detail-grid">
              <section className="card card--pad">
                <div className="card__header">
                  <div>
                    <h2>Client information</h2>
                    <p>Contact and project context</p>
                  </div>
                </div>
                <dl className="info-list">
                  <div>
                    <dt>
                      <Mail size={14} aria-hidden="true" /> Email
                    </dt>
                    <dd>
                      {client.contact_email ? (
                        <a href={`mailto:${client.contact_email}`} style={{ color: 'var(--brand-text)' }}>
                          {client.contact_email}
                        </a>
                      ) : (
                        <span className="muted">Not provided</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Phone size={14} aria-hidden="true" /> Phone
                    </dt>
                    <dd>
                      {client.contact_phone ? (
                        <a href={`tel:${client.contact_phone}`} style={{ color: 'var(--brand-text)' }}>
                          {client.contact_phone}
                        </a>
                      ) : (
                        <span className="muted">Not provided</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <MapPin size={14} aria-hidden="true" /> Contact person
                    </dt>
                    <dd>{client.contact_name || <span className="muted">Not provided</span>}</dd>
                  </div>
                  <div>
                    <dt>
                      <StickyNote size={14} aria-hidden="true" /> Notes
                    </dt>
                    <dd>{client.notes || <span className="muted">No notes yet.</span>}</dd>
                  </div>
                </dl>
              </section>

              <section className="card card--pad">
                <div className="card__header">
                  <div>
                    <h2>Payment history</h2>
                    <p>
                      {payments.length} recorded transaction{payments.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Button size="sm" icon={Plus} onClick={() => setPaymentOpen(true)}>
                    Add
                  </Button>
                </div>
                {payments.length === 0 ? (
                  <EmptyState
                    icon={ReceiptText}
                    title="No payments yet"
                    description="Record the down payment or first installment."
                  />
                ) : (
                  <ul className="stack" style={{ gap: 'var(--sp-2)' }}>
                    {payments.map((payment) => (
                      <li className="payment-row" key={payment.id}>
                        <span className="payment-row__icon" aria-hidden="true">
                          <ReceiptText size={16} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <strong>{statusLabel(payment.payment_type)}</strong>
                          <span className="truncate">
                            {date(payment.payment_date)}
                            {payment.reference_number ? ` · ${payment.reference_number}` : ''}
                          </span>
                        </span>
                        <strong className="numeric"><Amount value={payment.amount} code={client.currency} /></strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'board' && (
            <>
              <div className="section__head">
                <div>
                  <span className="eyebrow">Delivery workflow</span>
                  <h2>Project board</h2>
                  <p>Drag a task between columns, or use its menu to move it with the keyboard.</p>
                </div>
              </div>
              <KanbanBoard clientId={id} board={board} members={members} onRefresh={refresh} />
            </>
          )}

          {tab === 'payments' && (
            <section className="card card--flush">
              {payments.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title="No payments yet"
                  description="Record the down payment or first installment."
                  action={
                    <Button variant="primary" icon={Plus} onClick={() => setPaymentOpen(true)}>
                      Record payment
                    </Button>
                  }
                />
              ) : (
                <div className="table-wrap" style={{ border: 0, boxShadow: 'none' }}>
                  <table className="table">
                    <caption className="visually-hidden">Payments for {client.name}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Type</th>
                        <th scope="col">Date</th>
                        <th scope="col">Reference</th>
                        <th scope="col">Notes</th>
                        <th scope="col" className="num">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="table__primary">{statusLabel(payment.payment_type)}</td>
                          <td>{date(payment.payment_date)}</td>
                          <td>{payment.reference_number || <span className="muted">—</span>}</td>
                          <td>{payment.notes || <span className="muted">—</span>}</td>
                          <td className="num"><Amount value={payment.amount} code={client.currency} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4}>Total collected</td>
                        <td className="num"><Amount value={client.total_paid} code={client.currency} /></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'activity' && (
            <section className="card card--pad">
              {activity.length === 0 ? (
                <EmptyState icon={Clock3} title="No activity yet" description="Changes to this project will appear here." />
              ) : (
                <ul className="activity">
                  {activity.map((item) => (
                    <li key={item.id}>
                      <span className="activity__dot" aria-hidden="true" />
                      <div>
                        <strong>{statusLabel(item.action.replace('.', ' '))}</strong>
                        <span>
                          {item.actor?.full_name || 'DevBiz team'} · {relativeTime(item.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      {paymentOpen && (
        <PaymentForm
          remaining={client.remaining_balance}
          code={client.currency}
          onClose={() => setPaymentOpen(false)}
          onSave={savePayment}
        />
      )}
      {editOpen && <ClientForm client={client} onClose={() => setEditOpen(false)} onSave={saveClient} />}
    </>
  );
}
