import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/errors.js';

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;
const TOO_MANY = 'Too many attempts. Try again in 15 minutes.';

/**
 * Per-process fallback. Correct for a single long-lived server, and the only
 * option if the login_attempts migration has not been applied yet. On
 * serverless it is weak (each instance counts separately), which is exactly why
 * the shared Postgres counter below is preferred.
 */
const memory = new Map();

function memoryAllows(key) {
  const now = Date.now();
  const record = memory.get(key);

  if (!record || now - record.startedAt > WINDOW_SECONDS * 1000) {
    memory.set(key, { count: 1, startedAt: now });
    return true;
  }

  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

/**
 * Rate limits access-code attempts by client IP.
 *
 * Counting happens in Postgres so every serverless instance shares one budget.
 * If that call fails — migration not applied, database unreachable — it falls
 * back to the in-memory counter rather than locking the whole team out. A
 * degraded limiter is preferable to a broken login, but the warning is loud so
 * the cause gets noticed.
 */
export async function loginLimiter(req, _res, next) {
  const key = req.ip || 'unknown';

  try {
    const { data, error } = await getSupabaseAdmin().rpc('register_login_attempt', {
      p_ip: key,
      p_window_seconds: WINDOW_SECONDS,
      p_max_attempts: MAX_ATTEMPTS,
    });

    if (error) throw new Error(error.message);

    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.allowed === false) return next(new AppError(429, TOO_MANY));
    if (result) return next();

    throw new Error('register_login_attempt returned no row');
  } catch (err) {
    console.warn(`Login limiter falling back to in-memory counting: ${err.message}`);
    if (!memoryAllows(key)) return next(new AppError(429, TOO_MANY));
    return next();
  }
}

/** Resets the counter after a successful sign-in. */
export async function clearLoginAttempts(ip) {
  memory.delete(ip || 'unknown');

  try {
    await getSupabaseAdmin().from('login_attempts').delete().eq('ip', ip || 'unknown');
  } catch {
    // A stale row only costs the user their remaining attempts in this window.
  }
}
