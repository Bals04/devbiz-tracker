import { describe, expect, it } from 'vitest';
import { clientSchema, moveTaskSchema, paymentSchema } from './schemas.js';

describe('API validation', () => {
  it('rejects negative contract prices', () => {
    expect(clientSchema.safeParse({ name: 'Client', project_name: 'Website', contract_price: -1 }).success).toBe(false);
  });

  it('rejects zero-value payments', () => {
    expect(paymentSchema.safeParse({ amount: 0, payment_date: '2026-08-25' }).success).toBe(false);
  });

  it('accepts a valid task movement', () => {
    expect(moveTaskSchema.safeParse({ column_id: 'af8c8ea4-ef57-4f5d-a46d-1b06077b08aa', position: 2 }).success).toBe(true);
  });
});
