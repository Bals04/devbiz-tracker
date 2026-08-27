import { Banknote, PhilippinePeso, ReceiptText, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Data.jsx';
import { Alert, EmptyState, StatGridSkeleton, TableSkeleton } from '../components/ui/Feedback.jsx';
import { FilterSelect, SearchInput } from '../components/ui/Form.jsx';
import { useDebounced } from '../hooks/useLocalStorage.js';
import { useResource } from '../hooks/useResource.js';
import { date, statusLabel } from '../lib/format.js';
import { Amount } from '../components/ui/Amount.jsx';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'down_payment', label: 'Down payment' },
  { value: 'installment', label: 'Installment' },
  { value: 'final', label: 'Final payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
];

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

const TYPE_TONE = {
  down_payment: 'info',
  installment: 'neutral',
  final: 'success',
  refund: 'danger',
  other: 'neutral',
};

export function Payments() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [range, setRange] = useState('all');
  const debouncedQuery = useDebounced(query, 200);

  const { data, loading, error } = useResource(['/payments', '/dashboard/summary']);
  const [payments, summary] = data ?? [[], null];

  const visible = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    const cutoff =
      range === 'all' ? null : new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);

    return (payments ?? []).filter((payment) => {
      if (type !== 'all' && payment.payment_type !== type) return false;
      if (cutoff && payment.payment_date < cutoff) return false;
      if (!term) return true;
      return (
        payment.client?.name?.toLowerCase().includes(term) ||
        payment.client?.project_name?.toLowerCase().includes(term) ||
        payment.reference_number?.toLowerCase().includes(term)
      );
    });
  }, [payments, type, range, debouncedQuery]);

  // Refunds are stored as positive rows but reduce the net total, matching how
  // the client_summaries view computes total_paid.
  const total = visible.reduce(
    (sum, payment) => sum + (payment.payment_type === 'refund' ? -Number(payment.amount) : Number(payment.amount)),
    0,
  );

  const cards = [
    {
      label: 'Collected all time',
      value: <Amount value={summary?.collected_payments} compact />,
      icon: Banknote,
      tone: 'brand',
    },
    {
      label: 'Outstanding',
      value: <Amount value={summary?.outstanding_balance} compact />,
      icon: PhilippinePeso,
      tone: 'warn',
    },
    { label: 'In this view', value: <Amount value={total} compact />, icon: TrendingUp, tone: 'info' },
    { label: 'Transactions', value: visible.length, icon: ReceiptText, tone: 'violet' },
  ];

  const filtered = query || type !== 'all' || range !== 'all';

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Money in</span>
          <h1>Payments</h1>
          <p>Every transaction across every client, newest first.</p>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? <StatGridSkeleton /> : (
        <section className="stat-grid" aria-label="Payment summary">
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
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search client or reference"
          label="Search payments"
        />
        <FilterSelect label="Filter by type" value={type} onChange={setType} options={TYPE_OPTIONS} />
        <FilterSelect label="Filter by date" value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ReceiptText}
            title={filtered ? 'No matching payments' : 'No payments recorded yet'}
            description={
              filtered
                ? 'Try a different search term, type or date range.'
                : 'Payments appear here as soon as you record them on a client.'
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">All payments across clients</caption>
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">Type</th>
                <th scope="col">Date</th>
                <th scope="col">Reference</th>
                <th scope="col" className="num">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.client ? (
                      <Link to={`/clients/${payment.client.id}`} className="table__primary">
                        {payment.client.name}
                      </Link>
                    ) : (
                      <span className="table__primary">Unknown client</span>
                    )}
                    <span className="table__sub">{payment.client?.project_name}</span>
                  </td>
                  <td>
                    <Badge tone={TYPE_TONE[payment.payment_type] ?? 'neutral'}>
                      {statusLabel(payment.payment_type)}
                    </Badge>
                  </td>
                  <td>{date(payment.payment_date)}</td>
                  <td>{payment.reference_number || <span className="muted">—</span>}</td>
                  <td
                    className="num"
                    style={payment.payment_type === 'refund' ? { color: 'var(--danger)' } : undefined}
                  >
                    {payment.payment_type === 'refund' ? '−' : ''}
                    <Amount value={payment.amount} code={payment.client?.currency ?? 'PHP'} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Net total in this view</td>
                <td className="num"><Amount value={total} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
