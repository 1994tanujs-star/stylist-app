import crypto from 'crypto';

// PIN hashing with scrypt + per-user salt. Stored format: "<salt>:<hash>" (hex).
// No DB dependency here so db.js can import it without a cycle.

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function isHashed(stored) {
  return typeof stored === 'string' && /^[0-9a-f]{32}:[0-9a-f]{64}$/.test(stored);
}

export function verifyPin(pin, stored) {
  if (!isHashed(stored)) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
