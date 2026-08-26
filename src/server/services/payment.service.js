import { getSupabaseAdmin } from '../config/supabase.js';
import { assertData } from '../utils/errors.js';
import { logActivity } from './activity.service.js';

export async function listPayments(clientId) {
  return assertData(await getSupabaseAdmin().from('payments').select('*').eq('client_id', clientId).order('payment_date', { ascending: false }));
}

/**
 * Every payment across every client, for the workspace-wide ledger. Joins the
 * client so the UI can label each row without an N+1 fetch per payment.
 */
export async function listAllPayments({ limit = 500 } = {}) {
  return assertData(await getSupabaseAdmin()
    .from('payments')
    .select('*, client:clients(id,name,project_name,currency,archived_at)')
    .order('payment_date', { ascending: false })
    .limit(limit));
}

export async function createPayment(clientId, input, actorId) {
  const payment = assertData(await getSupabaseAdmin().from('payments').insert({ ...input, client_id: clientId, recorded_by: actorId }).select().single());
  await logActivity({ actorId, clientId, entityType: 'payment', entityId: payment.id, action: 'payment.recorded', metadata: { amount: payment.amount } });
  return payment;
}

export async function updatePayment(id, input, actorId) {
  const payment = assertData(await getSupabaseAdmin().from('payments').update(input).eq('id', id).select().single());
  await logActivity({ actorId, clientId: payment.client_id, entityType: 'payment', entityId: id, action: 'payment.updated', metadata: { fields: Object.keys(input) } });
  return payment;
}

export async function deletePayment(id, actorId) {
  const payment = assertData(await getSupabaseAdmin().from('payments').delete().eq('id', id).select().single());
  await logActivity({ actorId, clientId: payment.client_id, entityType: 'payment', entityId: id, action: 'payment.deleted', metadata: { amount: payment.amount } });
  return payment;
}
