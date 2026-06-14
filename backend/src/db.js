import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Allow overriding DB location (e.g. for sandboxes where the project dir is on a
// network/FUSE mount that SQLite can't write to). Defaults to backend/data/stylist.db.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'stylist.db');

// Ensure the parent directory exists before opening (SQLite won't create it).
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  passcode TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wardrobe_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  photo_url TEXT,
  category TEXT,
  colors TEXT,
  pattern TEXT,
  fabric TEXT,
  formality TEXT,
  occasions TEXT,
  name TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  needs_photo INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS style_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL UNIQUE,
  aesthetic_keywords TEXT,
  color_palette TEXT,
  preferred_silhouettes TEXT,
  influencer_references TEXT,
  preference_summary TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS looks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  date TEXT,
  item_ids TEXT,
  rationale TEXT,
  occasion TEXT,
  cue TEXT,
  status TEXT DEFAULT 'shown',
  feedback_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS preference_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  look_id INTEGER,
  item_ids TEXT,
  status TEXT,
  note TEXT,
  occasion TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS preference_summary_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  summary TEXT,
  based_on_signal_count INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS worn_outfits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  photo_url TEXT,
  date TEXT,
  item_ids TEXT,
  status TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Idempotent migrations: add columns to tables that may already exist in a
// previously-deployed DB (CREATE TABLE IF NOT EXISTS won't alter them).
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('wardrobe_items', 'occasions', 'TEXT');
addColumnIfMissing('looks', 'occasion', 'TEXT');
addColumnIfMissing('looks', 'cue', 'TEXT');
addColumnIfMissing('preference_signals', 'occasion', 'TEXT');

export function ensureUsers() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c === 0) {
    const insert = db.prepare('INSERT INTO users (name, passcode) VALUES (?, ?)');
    insert.run('Sagorika', '1234');
    insert.run('Tanuj', '5678');
    console.log('Seeded default users: Sagorika (PIN 1234), Tanuj (PIN 5678)');
  }
}
