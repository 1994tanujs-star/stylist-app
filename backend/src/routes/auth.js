import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// List user names (for the login screen profile picker - no passcodes returned)
router.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, name FROM users').all();
  res.json(rows);
});

// Login with userId + passcode
router.post('/login', (req, res) => {
  const { userId, passcode } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || user.passcode !== String(passcode)) {
    return res.status(401).json({ error: 'Invalid passcode' });
  }
  res.json({ id: user.id, name: user.name });
});

export default router;
