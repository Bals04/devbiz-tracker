import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError, assertData } from '../utils/errors.js';
import { logActivity } from './activity.service.js';

const clientSelect = '*';

export async function listClients({ search = '', archived = false } = {}) {
  let query = getSupabaseAdmin()
    .from('client_summaries')
    .select(clientSelect)
    .order('created_at', { ascending: false });
  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  if (search.trim()) {
    const safe = search.trim().replace(/[,%()]/g, ' ');
    query = query.or(`name.ilike.%${safe}%,project_name.ilike.%${safe}%,contact_name.ilike.%${safe}%`);
  }
  return assertData(await query);
}

export async function getClient(id) {
  const result = await getSupabaseAdmin()
    .from('client_summaries')
    .select('*')
    .eq('id', id)
    .single();
  if (result.error?.code === 'PGRST116') throw new AppError(404, 'Client not found');
  return assertData(result);
}

export async function createClient(input, actorId) {
  const client = assertData(await getSupabaseAdmin().from('clients').insert({ ...input, created_by: actorId }).select().single());
  await logActivity({ actorId, clientId: client.id, entityType: 'client', entityId: client.id, action: 'client.created' });
  return getClient(client.id);
}

export async function updateClient(id, input, actorId) {
  const result = await getSupabaseAdmin().from('clients').update(input).eq('id', id).select().single();
  if (result.error?.code === 'PGRST116') throw new AppError(404, 'Client not found');
  const client = assertData(result);
  await logActivity({ actorId, clientId: id, entityType: 'client', entityId: id, action: 'client.updated', metadata: { fields: Object.keys(input) } });
  return getClient(client.id);
}

export async function archiveClient(id, actorId) {
  const client = assertData(await getSupabaseAdmin().from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id).select().single());
  await logActivity({ actorId, clientId: id, entityType: 'client', entityId: id, action: 'client.archived' });
  return client;
}

export async function dashboardSummary() {
  const clients = await listClients();
  return {
    total_clients: clients.length,
    active_projects: clients.filter((item) => item.status === 'active').length,
    outstanding_balance: clients.reduce((sum, item) => sum + Number(item.remaining_balance), 0),
    collected_payments: clients.reduce((sum, item) => sum + Number(item.total_paid), 0),
  };
}
