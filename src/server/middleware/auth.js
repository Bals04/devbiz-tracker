import crypto from 'node:crypto';
import { getEnv } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const COOKIE_NAME = 'devbiz_session';
const SESSION_SECONDS = 60 * 60 * 12;
const encode = (value) => Buffer.from(value).toString('base64url');
const sign = (payload, secret) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

export function createSessionToken() {
  const payload = encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }));
  return `${payload}.${sign(payload, getEnv().ACCESS_TOKEN_SECRET)}`;
}

function readCookie(header = '') {
  return header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

function validToken(token) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload, getEnv().ACCESS_TOKEN_SECRET);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Math.floor(Date.now() / 1000); }
  catch { return false; }
}

export function sessionCookie(token) {
  const secure = getEnv().NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = getEnv().NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

export function requireAuth(req, _res, next) {
  if (!validToken(readCookie(req.headers.cookie))) return next(new AppError(401, 'Access code session required'));
  req.profile = { id: null, full_name: 'DevBiz Team', role: 'member' };
  next();
}
