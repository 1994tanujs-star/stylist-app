import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { anthropic, MODEL } from '../anthropic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Allow overriding the uploads location (e.g. a mounted persistent volume in
// production). Defaults to backend/uploads.
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

// List wardrobe items for a user, optional filters
router.get('/', (req, res) => {
  const { ownerId, category, color } = req.query;
  let query = 'SELECT * FROM wardrobe_items WHERE owner_id = ?';
  const params = [ownerId];
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  let rows = db.prepare(query).all(...params);
  if (color) {
    rows = rows.filter((r) => (r.colors || '').toLowerCase().includes(color.toLowerCase()));
  }
  res.json(rows);
});

// Upload a photo + run AI tagging, return suggested tags (not yet saved)
router.post('/tag-photo', upload.single('photo'), async (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.file.filename);
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const mediaType = req.file.mimetype || 'image/jpeg';

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Look at this clothing item photo. Respond ONLY with a JSON object (no markdown fences) with these fields:
{
  "name": "short descriptive name, e.g. 'Beige wide-leg trousers'",
  "category": "one of: top, bottom, dress, outerwear, shoes, bag, belt, hat, scarf, jewelry",
  "colors": "comma-separated main colors",
  "pattern": "e.g. solid, polka dot, striped, floral, print",
  "fabric": "best guess, e.g. linen, cotton, knit, denim, satin",
  "formality": "one of: casual, work, occasion"
}`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].text.trim();
    const jsonText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const tags = JSON.parse(jsonText);

    res.json({
      photo_url: `/uploads/${req.file.filename}`,
      tags,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tagging failed', details: err.message });
  }
});

// Upload a photo of a full outfit + run AI tagging, return suggested items (not yet saved)
router.post('/tag-outfit-photo', upload.single('photo'), async (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.file.filename);
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const mediaType = req.file.mimetype || 'image/jpeg';

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Look at this photo of a full outfit being worn. Identify each distinct clothing/accessory item visible. Respond ONLY with a JSON object (no markdown fences):
{
  "items": [
    {
      "name": "short descriptive name, e.g. 'Beige wide-leg trousers'",
      "category": "one of: top, bottom, dress, outerwear, shoes, bag, belt, hat, scarf, jewelry",
      "colors": "comma-separated main colors",
      "pattern": "e.g. solid, polka dot, striped, floral, print",
      "fabric": "best guess, e.g. linen, cotton, knit, denim, satin",
      "formality": "one of: casual, work, occasion"
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
    const parsed = JSON.parse(jsonText);

    res.json({
      photo_url: `/uploads/${req.file.filename}`,
      items: parsed.items || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Outfit tagging failed', details: err.message });
  }
});

// Save a new wardrobe item (after user confirms/edits tags)
router.post('/', (req, res) => {
  const { ownerId, photo_url, name, category, colors, pattern, fabric, formality, notes } = req.body;
  const result = db
    .prepare(
      `INSERT INTO wardrobe_items (owner_id, photo_url, name, category, colors, pattern, fabric, formality, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`
    )
    .run(ownerId, photo_url || null, name || '', category || '', colors || '', pattern || '', fabric || '', formality || '', notes || '');
  res.json({ id: Number(result.lastInsertRowid) });
});

// Update an item (e.g. add photo to a seeded item, or edit tags)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = ['photo_url', 'name', 'category', 'colors', 'pattern', 'fabric', 'formality', 'notes', 'needs_photo'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (key in fields) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields' });
  values.push(id);
  db.prepare(`UPDATE wardrobe_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM wardrobe_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
