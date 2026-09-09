import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError, assertData } from '../utils/errors.js';
import { computeSplits } from '../../shared/paymentSplits.js';
import { logActivity } from './activity.service.js';

const PAYMENT_SELECT = '*, splits:payment_splits(*, team_member:team_members(id,name,avatar_color))';

function withOrderedSplits(payment) {
  if (!payment) return payment;
  const splits = [...(payment.splits ?? [])].sort((a, b) => a.position - b.position);
  return { ...payment, splits };
}

async function readPayment(id) {
  return withOrderedSplits(assertData(
    await getSupabaseAdmin().from('payments').select(PAYMENT_SELECT).eq('id', id).single(),
  ));
}

export async function listPayments(clientId) {
  const rows = assertData(await getSupabaseAdmin()
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('client_id', clientId)
    .order('payment_date', { ascending: false }));
  return rows.map(withOrderedSplits);
}

/**
 * Every payment across every client, for the workspace-wide ledger. Joins the
 * client so the UI can label each row without an N+1 fetch per payment.
 */
export async function listAllPayments({ limit = 500 } = {}) {
  const rows = assertData(await getSupabaseAdmin()
    .from('payments')
    .select(`${PAYMENT_SELECT}, client:clients(id,name,project_name,currency,archived_at)`)
    .order('payment_date', { ascending: false })
    .limit(limit));
  return rows.map(withOrderedSplits);
}

async function preparedSplits(amount, splits) {
  if (!splits?.length) return [];

  const uniqueIds = [...new Set(splits.map((split) => split.team_member_id))];
  const members = assertData(await getSupabaseAdmin()
    .from('team_members')
    .select('id')
    .eq('is_active', true)
    .in('id', uniqueIds));
  if (members.length !== uniqueIds.length) {
    throw new AppError(422, 'Split includes a person who is not an active team member');
  }

  try {
    return computeSplits(amount, splits, { strict: true }).rows;
  } catch (error) {
    throw new AppError(422, error.message);
  }
}

export async function createPayment(clientId, input, actorId) {
  const { splits = [], ...payload } = input;
  const splitRows = await preparedSplits(payload.amount, splits);
  const supabase = getSupabaseAdmin();
  const payment = assertData(await supabase.from('payments').insert({
    ...payload,
    client_id: clientId,
    recorded_by: actorId,
  }).select().single());

  try {
    if (splitRows.length) {
      assertData(await supabase.from('payment_splits').insert(splitRows.map((row) => ({
        payment_id: payment.id,
        team_member_id: row.team_member_id,
        basis: row.basis,
        percent: row.percent,
        amount: row.amount,
        position: row.position,
      }))));
    }
  } catch (error) {
    await supabase.from('payments').delete().eq('id', payment.id);
    throw error;
  }

  await logActivity({
    actorId,
    clientId,
    entityType: 'payment',
    entityId: payment.id,
    action: 'payment.recorded',
    metadata: { amount: payment.amount, split_count: splitRows.length },
  });
  return readPayment(payment.id);
}

export async function updatePayment(id, input, actorId) {
  const payload = { ...input };
  delete payload.splits;
  const payment = assertData(await getSupabaseAdmin().from('payments').update(payload).eq('id', id).select().single());
  await logActivity({ actorId, clientId: payment.client_id, entityType: 'payment', entityId: id, action: 'payment.updated', metadata: { fields: Object.keys(payload) } });
  return readPayment(id);
}

export async function deletePayment(id, actorId) {
  const payment = assertData(await getSupabaseAdmin().from('payments').delete().eq('id', id).select().single());
  await logActivity({ actorId, clientId: payment.client_id, entityType: 'payment', entityId: id, action: 'payment.deleted', metadata: { amount: payment.amount } });
  return payment;
}
