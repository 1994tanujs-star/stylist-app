import express from 'express';
import { db } from '../db.js';
import { hashPin, verifyPin } from '../pin.js';
import { COOKIE_NAME, cookieOptions, createSession, destroySession, getTokenFromReq, getUserIdFromReq, requireAuth } from '../session.js';

const router = express.Router();

// List user names (for the login screen profile picker - no passcodes returned)
router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, name FROM users').all();
  res.json(rows);
});

// Login with userId + passcode → sets an httpOnly session cookie
router.post('/login', (req, res) => {
  const { userId, passcode } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !verifyPin(passcode, user.passcode)) {
    return res.status(401).json({ error: 'Invalid passcode' });
  }
  const token = createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ id: user.id, name: user.name });
});

// Who am I, per the session cookie (lets the frontend restore the session)
router.get('/me', (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  res.json(user);
});

// Logout: drop the session and clear the cookie
router.post('/logout', (req, res) => {
  destroySession(getTokenFromReq(req));
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// Change PIN (requires the current PIN)
router.post('/change-pin', requireAuth, (req, res) => {
  const { currentPin, newPin } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!verifyPin(currentPin, user.passcode)) {
    return res.status(401).json({ error: 'Current PIN is incorrect' });
  }
  if (!/^\d{4,6}$/.test(String(newPin || ''))) {
    return res.status(400).json({ error: 'New PIN must be 4–6 digits' });
  }
  db.prepare('UPDATE users SET passcode = ? WHERE id = ?').run(hashPin(newPin), req.userId);
  res.json({ ok: true });
});

export default router;
