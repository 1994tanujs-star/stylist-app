import crypto from 'crypto';
import { db } from './db.js';

// Opaque, DB-backed session tokens delivered as an httpOnly cookie. Stored on
// the volume so they survive redeploys. The cookie is same-origin (the backend
// serves the frontend), so it also authenticates <img> requests to /uploads.

export const COOKIE_NAME = 'sid';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: THIRTY_DAYS_MS,
    path: '/',
  };
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    new Date().toISOString()
  );
  return token;
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function getTokenFromReq(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
}

export function getUserIdFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const row = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  return row ? row.user_id : null;
}

// Express middleware: rejects unauthenticated requests and sets req.userId so
// handlers derive ownership from the session, never from client-supplied input.
export function requireAuth(req, res, next) {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  req.userId = userId;
  next();
}
