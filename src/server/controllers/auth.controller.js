import crypto from 'node:crypto';
import { getEnv } from '../config/env.js';
import { clearSessionCookie, createSessionToken, sessionCookie } from '../middleware/auth.js';
import { clearLoginAttempts } from '../middleware/loginLimiter.js';
import { AppError } from '../utils/errors.js';

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function access(req, res) {
  if (!safeEqual(req.body.code, getEnv().TEAM_ACCESS_CODE)) throw new AppError(401, 'Incorrect access code');
  await clearLoginAttempts(req.ip);
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken()));
  res.json({ authenticated: true, member: { full_name: 'DevBiz Team' } });
}

export function logout(_req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ authenticated: false });
}
