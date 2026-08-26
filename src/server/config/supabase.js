import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let client;

export function getSupabaseAdmin() {
  if (!client) {
    const env = getEnv();
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
