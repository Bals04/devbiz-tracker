import { ChevronRight, Plus, ReceiptText, X } from 'lucide-react';
import { Amount } from './ui/Amount.jsx';
import { Avatar } from './ui/Data.jsx';
import { Button, IconButton } from './ui/Button.jsx';
import { Input, Select } from './ui/Form.jsx';
import { Modal } from './ui/Modal.jsx';
import { date, statusLabel } from '../lib/format.js';
import { computeSplits, explainSplits, formatPercent, splitBasisLabel } from '../../shared/paymentSplits.js';

function nextMemberId(members, splits) {
  const taken = new Set(splits.map((row) => row.team_member_id).filter(Boolean));
  return members.find((member) => !taken.has(member.id))?.id || '';
}

function newSplitRow(members, splits) {
  return {
    key: crypto.randomUUID(),
    team_member_id: nextMemberId(members, splits),
    percent: '',
    basis: 'payment',
  };
}

export function SplitSummary({ splits = [], code = 'PHP' }) {
  const rows = [...splits]
    .filter((split) => split.team_member)
    .sort((a, b) => a.position - b.position);
  if (!rows.length) return null;

  return (
    <span className="assignee-list split-summary">
      {rows.map((split) => {
        const pretty = formatPercent(split.percent);
        const title = `${split.team_member.name} · ${pretty}% ${splitBasisLabel(split.basis)}`;
        return (
          <span className="assignee-tag" key={split.id ?? split.team_member_id} title={title}>
            <Avatar name={split.team_member.name} color={split.team_member.avatar_color} size="sm" />
            <span className="truncate">{split.team_member.name}</span>
            <span className="numeric">
              <Amount value={split.amount} code={code} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function SplitBuilder({ members = [], splits, onChange, amount, code = 'PHP' }) {
  let preview = { rows: [], leftover: Number(amount || 0) };
  let previewError = '';
  try {
    preview = computeSplits(amount || 0, splits);
  } catch (error) {
    previewError = error.message;
  }

  const previewByMember = Object.fromEntries(preview.rows.map((row) => [row.team_member_id, row]));
  const taken = new Set(splits.map((row) => row.team_member_id).filter(Boolean));
  const canAdd = members.some((member) => !taken.has(member.id));

  const update = (key, patch) => {
    onChange(splits.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  return (
    <div className="split-builder">
      <p className="field__hint" style={{ marginBottom: 0 }}>
        Each share is a percent of this payment. Anything not assigned stays unassigned.
      </p>

      {!members.length && (
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
          Add team members in Settings before splitting a payment.
        </p>
      )}

      {members.length > 0 &&
        splits.map((row, index) => {
          const options = members.filter((member) => member.id === row.team_member_id || !taken.has(member.id));
          const share = previewByMember[row.team_member_id];
          return (
            <div className="split-row" key={row.key}>
              <Select
                aria-label={`Team member for split ${index + 1}`}
                value={row.team_member_id}
                onChange={(event) => update(row.key, { team_member_id: event.target.value })}
              >
                {options.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
              <div className="split-row__percent">
                <Input
                  aria-label={`Percent for split ${index + 1}`}
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="15"
                  value={row.percent}
                  onChange={(event) => update(row.key, { percent: event.target.value })}
                />
                <span aria-hidden="true">%</span>
              </div>
              <span className="split-row__amount numeric">
                {share ? <Amount value={share.amount} code={code} /> : '—'}
              </span>
              <IconButton
                icon={X}
                small
                label={`Remove split ${index + 1}`}
                onClick={() => onChange(splits.filter((item) => item.key !== row.key))}
              />
            </div>
          );
        })}

      <div className="split-builder__footer">
        <Button
          size="sm"
          icon={Plus}
          disabled={!canAdd}
          onClick={() => onChange([...splits, newSplitRow(members, splits)])}
        >
          Add person
        </Button>
        {previewError ? (
          <span className="split-builder__status split-builder__status--warn">{previewError}</span>
        ) : amount > 0 ? (
          <span className="split-builder__status">
            {preview.leftover > 0 ? (
              <>
                <Amount value={preview.leftover} code={code} /> unassigned
              </>
            ) : preview.rows.length > 0 ? (
              'The full payment is assigned'
            ) : (
              'No shares assigned yet'
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SplitBreakdown({ payment, code = 'PHP' }) {
  const { total, leftover, steps } = explainSplits(payment.amount, payment.splits ?? []);

  return (
    <div className="split-breakdown">
      <div className="split-breakdown__total">
        <span>Client paid</span>
        <strong className="numeric">
          <Amount value={total} code={code} />
        </strong>
      </div>

      {steps.length === 0 ? (
        <p className="muted" style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>
          This payment was not split with the team.
        </p>
      ) : (
        <ol className="split-breakdown__steps">
          {steps.map((step, index) => {
            const name = step.team_member?.name || 'Unknown';
            const pretty = formatPercent(step.percent);
            return (
              <li className="split-step" key={step.id ?? `${step.team_member_id}-${index}`}>
                <div className="split-step__who">
                  <Avatar name={name} color={step.team_member?.avatar_color} size="sm" />
                  <strong>{name}</strong>
                </div>
                <p className="split-step__rule">
                  {pretty}% {splitBasisLabel(step.basis)}
                </p>
                <p className="split-step__formula numeric">
                  <Amount value={step.base} code={code} />
                  {' × '}
                  {pretty}%
                  {' = '}
                  <Amount value={step.share} code={code} />
                </p>
                <p className="split-step__left">
                  <Amount value={step.remainingAfter} code={code} /> left after this share
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="split-breakdown__total">
        {leftover > 0 ? (
          <>
            <span>Unassigned</span>
            <strong className="numeric">
              <Amount value={leftover} code={code} />
            </strong>
          </>
        ) : (
          <>
            <span>Assigned in full</span>
            <strong className="numeric">
              <Amount value={total} code={code} />
            </strong>
          </>
        )}
      </div>
    </div>
  );
}

export function PaymentSplitDialog({ payment, code = 'PHP', onClose }) {
  if (!payment) return null;

  return (
    <Modal
      title="Split calculation"
      description={`${statusLabel(payment.payment_type)} · ${date(payment.payment_date)}`}
      onClose={onClose}
      footer={
        <Button onClick={onClose}>Close</Button>
      }
    >
      <SplitBreakdown payment={payment} code={code} />
    </Modal>
  );
}

export function PaymentHistoryCard({ payment, code = 'PHP', onOpen }) {
  return (
    <button
      type="button"
      className="payment-row"
      onClick={() => onOpen(payment)}
      aria-label={`Split calculation for ${statusLabel(payment.payment_type)} on ${date(payment.payment_date)}`}
    >
      <span className="payment-row__icon" aria-hidden="true">
        <ReceiptText size={16} />
      </span>
      <span style={{ minWidth: 0 }}>
        <strong>{statusLabel(payment.payment_type)}</strong>
        <span className="payment-row__meta truncate">
          {date(payment.payment_date)}
          {payment.reference_number ? ` · ${payment.reference_number}` : ''}
        </span>
        <SplitSummary splits={payment.splits} code={code} />
      </span>
      <span className="payment-row__total">
        <strong className="numeric">
          <Amount value={payment.amount} code={code} />
        </strong>
        <ChevronRight size={16} aria-hidden="true" />
      </span>
    </button>
  );
}
