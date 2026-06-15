import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { anthropic, MODEL } from '../anthropic.js';
import { getWardrobe, generateLook, recordPreferenceSignal, LAYOUTS } from './looks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Same uploads location as wardrobe photos so the per-user photo gate covers these too.
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage });

const router = express.Router();

const ALLOWED_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

// Fetch an image from a pasted URL, store a local copy, and return { filename, base64, mediaType }.
async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Could not fetch image (HTTP ${resp.status})`);
  const mediaType = (resp.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED_EXT[mediaType]) throw new Error('That link is not a direct image (jpg/png/webp/gif)');
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > 10 * 1024 * 1024) throw new Error('Image is too large (max 10MB)');
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ALLOWED_EXT[mediaType]}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buf);
  return { filename, base64: buf.toString('base64'), mediaType };
}

// Build the compact wardrobe summary the model uses to match garments to owned items.
function wardrobeSummary(wardrobe) {
  return wardrobe
    .map((w) => `id:${w.id} | ${w.category} | ${w.name} | colors: ${w.colors} | pattern: ${w.pattern} | fabric: ${w.fabric} | formality: ${w.formality}`)
    .join('\n');
}

// Single Claude vision call: detect garments in the inspiration image, match each to the
// user's wardrobe where possible, and describe a shoppable gap otherwise.
async function analyzeInspiration({ base64, mediaType, wardrobe }) {
  const summary = wardrobeSummary(wardrobe) || '(wardrobe is empty)';
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `This is an inspiration/outfit photo the user saved (e.g. from Pinterest or an influencer). Break the look down into its distinct garments and accessories.

For EACH garment, decide whether the user can recreate it with something already in their wardrobe (listed below). Match by category + color + vibe — it doesn't have to be identical, just close enough to wear in this look. If nothing in the wardrobe works, treat it as a gap to buy.

USER'S WARDROBE (id | category | name | colors | pattern | fabric | formality):
${summary}

Respond ONLY with a JSON object (no markdown fences):
{
  "vibe": "one short phrase describing the overall vibe of the look",
  "garments": [
    {
      "slot": "one of: top, bottom, dress, outerwear, shoes, bag, belt, hat, scarf, jewelry",
      "description": "short shoppable description, e.g. 'wide-leg cream linen trousers'",
      "match_item_id": <wardrobe id if a close-enough owned item exists, else null>,
      "confidence": "high | medium | low — only when match_item_id is set",
      "search_query": "concise shopping search query — only when match_item_id is null"
    }
  ]
}`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].text.trim();
  const jsonText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(jsonText);
}

// Resolve a stored analysis into owned items (with full wardrobe rows) + gaps.
function resolveBreakdown(ownerId, analysis) {
  const garments = Array.isArray(analysis?.garments) ? analysis.garments : [];
  const owned = [];
  const gaps = [];
  for (const g of garments) {
    const id = Number(g.match_item_id);
    const item = id ? db.prepare('SELECT * FROM wardrobe_items WHERE id = ? AND owner_id = ?').get(id, ownerId) : null;
    if (item) {
      owned.push({ slot: g.slot, description: g.description, confidence: g.confidence || 'medium', item });
    } else {
      gaps.push({ slot: g.slot, description: g.description, search_query: g.search_query || g.description });
    }
  }
  return { vibe: analysis?.vibe || '', owned, gaps };
}

function rowToBreakdown(row) {
  const analysis = JSON.parse(row.analysis || '{}');
  return { look: row, ...resolveBreakdown(row.owner_id, analysis) };
}

// Create an inspiration look from an uploaded photo OR a pasted image URL.
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const ownerId = req.userId;
    const caption = (req.body.caption || '').trim() || null;
    const sourceUrl = (req.body.source_url || '').trim() || null;

    let filename, base64, mediaType;
    if (req.file) {
      filename = req.file.filename;
      base64 = fs.readFileSync(path.join(uploadsDir, filename)).toString('base64');
      mediaType = req.file.mimetype || 'image/jpeg';
    } else if (sourceUrl) {
      ({ filename, base64, mediaType } = await downloadImage(sourceUrl));
    } else {
      return res.status(400).json({ error: 'Provide a photo or an image link' });
    }

    const photoUrl = `/uploads/${filename}`;
    db.prepare('INSERT OR REPLACE INTO uploads (filename, owner_id) VALUES (?, ?)').run(filename, ownerId);

    const wardrobe = getWardrobe(ownerId);
    const analysis = await analyzeInspiration({ base64, mediaType, wardrobe });

    const result = db
      .prepare('INSERT INTO inspiration_looks (owner_id, photo_url, source_url, caption, vibe, analysis) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ownerId, photoUrl, sourceUrl, caption, analysis.vibe || '', JSON.stringify(analysis));
    const row = db.prepare('SELECT * FROM inspiration_looks WHERE id = ?').get(Number(result.lastInsertRowid));

    res.json(rowToBreakdown(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not analyze inspiration', details: err.message });
  }
});

// List the user's inspiration board, newest first.
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM inspiration_looks WHERE owner_id = ? ORDER BY id DESC').all(req.userId);
    res.json(rows.map(rowToBreakdown));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load inspiration board', details: err.message });
  }
});

// One look's full breakdown.
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM inspiration_looks WHERE id = ? AND owner_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Inspiration not found' });
  res.json(rowToBreakdown(row));
});

// Record love / not-for-me on an inspiration look and feed it into preference learning.
router.post('/:id/feedback', async (req, res) => {
  try {
    const { status, note } = req.body; // 'loved' | 'not_for_me'
    const row = db.prepare('SELECT * FROM inspiration_looks WHERE id = ? AND owner_id = ?').get(req.params.id, req.userId);
    if (!row) return res.status(404).json({ error: 'Inspiration not found' });

    db.prepare('UPDATE inspiration_looks SET status = ? WHERE id = ?').run(status, row.id);

    // Signal learns from the owned items the user is drawn to in this inspiration.
    const { owned } = rowToBreakdown(row);
    const itemIds = owned.map((o) => o.item.id);
    await recordPreferenceSignal(req.userId, null, JSON.stringify(itemIds), status, note || row.vibe);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save feedback', details: err.message });
  }
});

// "Wear a version now": generate a real look seeded with the owned matches + the look's vibe.
router.post('/:id/wear', async (req, res) => {
  try {
    const ownerId = req.userId;
    const row = db.prepare('SELECT * FROM inspiration_looks WHERE id = ? AND owner_id = ?').get(req.params.id, ownerId);
    if (!row) return res.status(404).json({ error: 'Inspiration not found' });

    const { vibe, owned } = rowToBreakdown(row);
    const seedItemIds = owned.map((o) => o.item.id);
    if (seedItemIds.length === 0) {
      return res.status(400).json({ error: "None of this look's pieces are in your closet yet — shop the gaps first." });
    }

    const cue = vibe ? `recreate this vibe: ${vibe}` : undefined;
    const generated = await generateLook(ownerId, { cue, refineItems: seedItemIds });

    const today = new Date().toISOString().slice(0, 10);
    db.prepare("UPDATE looks SET status = 'regenerated' WHERE owner_id = ? AND date = ? AND status = 'shown'").run(ownerId, today);
    const result = db
      .prepare("INSERT INTO looks (owner_id, date, item_ids, rationale, cue, status) VALUES (?, ?, ?, ?, ?, 'shown')")
      .run(ownerId, today, JSON.stringify(generated.item_ids), generated.rationale, cue || null);
    const look = db.prepare('SELECT * FROM looks WHERE id = ?').get(Number(result.lastInsertRowid));
    look.layout = generated.layout;

    const items = generated.item_ids
      .map((id) => db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id))
      .filter(Boolean);

    res.json({ look, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build a look', details: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT owner_id FROM inspiration_looks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Inspiration not found' });
  if (row.owner_id !== req.userId) return res.status(403).json({ error: 'Not yours' });
  db.prepare('DELETE FROM inspiration_looks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
