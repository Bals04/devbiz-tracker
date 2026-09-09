import { useState } from 'react';
import { currency } from '../lib/format.js';
import { computeSplits } from '../../shared/paymentSplits.js';
import { Alert } from './ui/Feedback.jsx';
import { Button } from './ui/Button.jsx';
import { Field, Input, Select, Segmented, Textarea } from './ui/Form.jsx';
import { Modal } from './ui/Modal.jsx';
import { SplitBuilder } from './PaymentSplits.jsx';

const TYPES = [
  { value: 'down_payment', label: 'Down payment' },
  { value: 'installment', label: 'Installment' },
  { value: 'final', label: 'Final payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
];

const SPLIT_OPTIONS = [
  { value: 'none', label: 'No split' },
  { value: 'split', label: 'Split' },
];

function emptySplitRow(members = []) {
  return {
    key: crypto.randomUUID(),
    team_member_id: members[0]?.id || '',
    percent: '',
    basis: 'payment',
  };
}

export function PaymentForm({ onClose, onSave, remaining, code = 'PHP', members = [] }) {
  const [form, setForm] = useState({
    amount: '',
    payment_type: 'installment',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    notes: '',
  });
  const [splitting, setSplitting] = useState(false);
  const [splits, setSplits] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const amount = Number(form.amount || 0);
  // A refund legitimately exceeds the balance, so only warn on real payments.
  const overpaying =
    remaining != null && form.payment_type !== 'refund' && amount > Number(remaining) && amount > 0;

  const toggleSplit = (value) => {
    const enabled = value === 'split';
    setSplitting(enabled);
    setSplits((current) => (enabled ? (current.length ? current : [emptySplitRow(members)]) : []));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, amount };
      if (splitting) {
        const rows = splits
          .filter((row) => row.team_member_id && Number(row.percent) > 0)
          .map(({ team_member_id, percent }) => ({
            team_member_id,
            basis: 'payment',
            percent: Number(percent),
          }));
        if (!rows.length) {
          throw new Error('Add at least one person to the split.');
        }
        computeSplits(amount, rows, { strict: true });
        payload.splits = rows;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Record a payment"
      description={
        remaining != null ? `Outstanding balance is ${currency(remaining, code)}.` : undefined
      }
      wide={splitting}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" variant="primary" loading={saving}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="stack" style={{ gap: 'var(--sp-4)' }}>
        {error && <Alert>{error}</Alert>}

        <Field label="Amount">
          {(props) => (
            <Input
              {...props}
              autoFocus
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={set('amount')}
              placeholder="0.00"
            />
          )}
        </Field>

        {overpaying && (
          <Alert type="warn">
            This is more than the {currency(remaining, code)} still outstanding. Record it only if the client
            genuinely overpaid.
          </Alert>
        )}

        <Field label="Payment type">
          {(props) => (
            <Select {...props} value={form.payment_type} onChange={set('payment_type')}>
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="field">
          <span className="field__label">
            Team split
          </span>
          <Segmented
            options={SPLIT_OPTIONS}
            value={splitting ? 'split' : 'none'}
            onChange={toggleSplit}
            label="Team split"
          />
          {splitting ? (
            <SplitBuilder
              members={members}
              splits={splits}
              onChange={setSplits}
              amount={amount}
              code={code}
            />
          ) : null}
        </div>

        <Field label="Payment date">
          {(props) => (
            <Input {...props} required type="date" value={form.payment_date} onChange={set('payment_date')} />
          )}
        </Field>

        <Field label="Reference number" optional hint="Receipt number or bank transfer ID.">
          {(props) => (
            <Input {...props} value={form.reference_number} onChange={set('reference_number')} placeholder="e.g. GC-88213" />
          )}
        </Field>

        <Field label="Notes" optional>
          {(props) => <Textarea {...props} rows={3} value={form.notes} onChange={set('notes')} />}
        </Field>
      </form>
    </Modal>
  );
}
