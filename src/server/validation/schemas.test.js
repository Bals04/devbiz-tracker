import { describe, expect, it } from 'vitest';
import { clientSchema, moveTaskSchema, paymentSchema } from './schemas.js';

const ERMAN = '11111111-1111-4111-8111-111111111111';
const JASMINE = '22222222-2222-4222-8222-222222222222';

describe('API validation', () => {
  it('rejects negative contract prices', () => {
    expect(clientSchema.safeParse({ name: 'Client', project_name: 'Website', contract_price: -1 }).success).toBe(false);
  });

  it('rejects zero-value payments', () => {
    expect(paymentSchema.safeParse({ amount: 0, payment_date: '2026-08-25' }).success).toBe(false);
  });

  it('accepts a waterfall split on a payment', () => {
    const result = paymentSchema.safeParse({
      amount: 3000,
      payment_date: '2026-09-10',
      splits: [
        { team_member_id: ERMAN, basis: 'payment', percent: 15 },
        { team_member_id: JASMINE, basis: 'remaining', percent: 50 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid task movement', () => {
    expect(moveTaskSchema.safeParse({ column_id: 'af8c8ea4-ef57-4f5d-a46d-1b06077b08aa', position: 2 }).success).toBe(true);
  });
});
