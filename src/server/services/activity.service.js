import { getSupabaseAdmin } from '../config/supabase.js';

export async function logActivity({ actorId, clientId, entityType, entityId, action, metadata = {} }) {
  const { error } = await getSupabaseAdmin().from('activity_logs').insert({
    actor_id: actorId,
    client_id: clientId,
    entity_type: entityType,
    entity_id: String(entityId),
    action,
    metadata,
  });
  if (error) console.error('Activity log failed:', error.message);
}
