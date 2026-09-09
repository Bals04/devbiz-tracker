import { describe, expect, it } from 'vitest';
import { computeSplits, explainSplits } from './paymentSplits.js';

const ERMAN = '11111111-1111-4111-8111-111111111111';
const JASMINE = '22222222-2222-4222-8222-222222222222';
const JONHYL = '33333333-3333-4333-8333-333333333333';

describe('computeSplits', () => {
  it('gives 15% of 3000 to one person and half of the remainder to another', () => {
    const result = computeSplits(3000, [
      { team_member_id: ERMAN, basis: 'payment', percent: 15 },
      { team_member_id: JASMINE, basis: 'remaining', percent: 50 },
    ], { strict: true });

    expect(result.rows.map((row) => row.amount)).toEqual([450, 1275]);
    expect(result.leftover).toBe(1275);
  });

  it('lets a later row take the rest of what’s left', () => {
    const result = computeSplits(3000, [
      { team_member_id: ERMAN, basis: 'payment', percent: 15 },
      { team_member_id: JASMINE, basis: 'remaining', percent: 50 },
      { team_member_id: JONHYL, basis: 'remaining', percent: 100 },
    ], { strict: true });

    expect(result.rows.map((row) => row.amount)).toEqual([450, 1275, 1275]);
    expect(result.leftover).toBe(0);
  });

  it('rejects two rows for the same person', () => {
    expect(() => computeSplits(1000, [
      { team_member_id: ERMAN, basis: 'payment', percent: 10 },
      { team_member_id: ERMAN, basis: 'remaining', percent: 50 },
    ])).toThrow(/once/);
  });

  it('rejects shares that add up to more than the payment', () => {
    expect(() => computeSplits(1000, [
      { team_member_id: ERMAN, basis: 'payment', percent: 80 },
      { team_member_id: JASMINE, basis: 'payment', percent: 80 },
    ], { strict: true })).toThrow(/more than the payment/);
  });
});

describe('explainSplits', () => {
  it('shows the base, share and remainder for each waterfall step', () => {
    const result = explainSplits(3000, [
      { position: 0, basis: 'payment', percent: 15, amount: 450 },
      { position: 1, basis: 'remaining', percent: 50, amount: 1275 },
    ]);

    expect(result.steps[0]).toMatchObject({ base: 3000, share: 450, remainingAfter: 2550 });
    expect(result.steps[1]).toMatchObject({ base: 2550, share: 1275, remainingAfter: 1275 });
    expect(result.leftover).toBe(1275);
  });
});
