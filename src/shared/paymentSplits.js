/** Whole-cent helpers so 15% of 3000 is exactly 450, not 449.999. */
export const toCents = (value) => Math.round(Number(value) * 100);
export const fromCents = (cents) => cents / 100;

/**
 * Applies split rows in order, like a waterfall:
 *   15% of the payment, then half of what’s left, then the rest, and so on.
 *
 * `strict` is for the API: incomplete or over-allocated rows are errors.
 * The form preview is lenient so a half-filled row does not blow up the UI.
 */
export function computeSplits(amount, splits = [], { strict = false } = {}) {
  const ids = splits.map((split) => split.team_member_id).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Each person can only appear once in a split');
  }

  const totalCents = toCents(amount);
  if (!Number.isFinite(totalCents) || totalCents < 0) {
    throw new Error('Payment amount is invalid');
  }

  let remainingCents = totalCents;
  const rows = [];

  splits.forEach((split, position) => {
    const percent = Number(split.percent);
    const complete = Boolean(split.team_member_id) && Number.isFinite(percent) && percent > 0;

    if (!complete) {
      if (strict) throw new Error('Each split needs a person and a percentage');
      return;
    }
    if (percent > 100) {
      throw new Error('A split cannot be more than 100%');
    }
    if (split.basis !== 'payment' && split.basis !== 'remaining') {
      throw new Error('Split basis must be the payment or the remaining amount');
    }

    const baseCents = split.basis === 'remaining' ? remainingCents : totalCents;
    const requestedCents = Math.round((baseCents * percent) / 100);

    if (strict && requestedCents < 1) {
      throw new Error('A split share cannot round to zero');
    }
    if (strict && requestedCents > remainingCents) {
      throw new Error('Split shares add up to more than the payment');
    }

    const shareCents = Math.min(Math.max(requestedCents, 0), remainingCents);
    remainingCents -= shareCents;
    rows.push({
      team_member_id: split.team_member_id,
      basis: split.basis,
      percent,
      position,
      amount: fromCents(shareCents),
    });
  });

  return {
    rows,
    leftover: fromCents(remainingCents),
    total: fromCents(totalCents),
  };
}

export function splitBasisLabel(basis) {
  return basis === 'remaining' ? 'of what’s left' : 'of this payment';
}

export function formatPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return '';
  return Number.isInteger(percent) ? String(percent) : String(percent);
}

/**
 * Walks stored split rows in order and records the base each percent was
 * applied to, plus the remainder after that share came out.
 */
export function explainSplits(amount, splits = []) {
  const totalCents = toCents(amount);
  let remainingCents = totalCents;
  const steps = [...splits]
    .sort((a, b) => a.position - b.position)
    .map((split) => {
      const baseCents = split.basis === 'remaining' ? remainingCents : totalCents;
      const shareCents = toCents(split.amount);
      remainingCents -= shareCents;
      return {
        ...split,
        percent: Number(split.percent),
        base: fromCents(baseCents),
        share: fromCents(shareCents),
        remainingAfter: fromCents(remainingCents),
      };
    });

  return {
    total: fromCents(totalCents),
    leftover: fromCents(remainingCents),
    steps,
  };
}
