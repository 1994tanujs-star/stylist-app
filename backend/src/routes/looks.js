import express from 'express';
import { db } from '../db.js';
import { anthropic, MODEL } from '../anthropic.js';

const router = express.Router();

const LAYOUTS = ['stacked', 'spread', 'sidebyside'];

function getWardrobe(ownerId) {
  return db.prepare('SELECT * FROM wardrobe_items WHERE owner_id = ?').all(ownerId);
}

function getStyleProfile(ownerId) {
  return db.prepare('SELECT * FROM style_profile WHERE owner_id = ?').get(ownerId);
}

function getTodayLook(ownerId, date) {
  return db
    .prepare("SELECT * FROM looks WHERE owner_id = ? AND date = ? AND status != 'regenerated' ORDER BY id DESC LIMIT 1")
    .get(ownerId, date);
}

async function generateLook(ownerId, excludeItemIds = []) {
  const wardrobe = getWardrobe(ownerId).filter((w) => !excludeItemIds.includes(w.id) || true);
  const profile = getStyleProfile(ownerId);

  const wardrobeSummary = wardrobe
    .map((w) => `id:${w.id} | ${w.category} | ${w.name} | colors: ${w.colors} | pattern: ${w.pattern} | fabric: ${w.fabric} | formality: ${w.formality}`)
    .join('\n');

  const recentLooks = db
    .prepare('SELECT item_ids FROM looks WHERE owner_id = ? ORDER BY id DESC LIMIT 5')
    .all(ownerId)
    .map((l) => l.item_ids);

  const prompt = `You are a personal stylist. Pick one outfit (3-5 items) from the wardrobe below that forms a cohesive look matching the style profile.

STYLE PROFILE:
- Aesthetic: ${profile?.aesthetic_keywords || 'relaxed, comfortable, chic'}
- Color palette: ${profile?.color_palette || 'soft neutrals and pastels'}
- Preferred silhouettes: ${profile?.preferred_silhouettes || 'flowing, wide-leg, midi'}
- Influencer references (for vibe only): ${profile?.influencer_references || 'none'}

LEARNED PREFERENCES SO FAR:
${profile?.preference_summary || 'No feedback yet — use the style profile as the guide.'}

WARDROBE (id | category | name | colors | pattern | fabric | formality):
${wardrobeSummary}

AVOID exactly repeating these recent combos (item id sets): ${JSON.stringify(recentLooks)}
${excludeItemIds.length ? `Also avoid using this exact set again: ${JSON.stringify(excludeItemIds)}` : ''}

Respond ONLY with JSON (no markdown fences):
{
  "item_ids": [list of 3-5 item ids from the wardrobe above],
  "rationale": "one short sentence on why this combo works and the vibe it gives"
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  const jsonText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(jsonText);

  const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];

  return { item_ids: parsed.item_ids, rationale: parsed.rationale, layout };
}

// GET the most recently created look for this user — does NOT generate a new one.
// Returns { look: null, items: [] } if no look has ever been created.
router.get('/latest', (req, res) => {
  try {
    const ownerId = Number(req.query.ownerId);
    const look = db
      .prepare('SELECT * FROM looks WHERE owner_id = ? ORDER BY id DESC LIMIT 1')
      .get(ownerId);

    if (!look) {
      return res.json({ look: null, items: [] });
    }

    look.layout = LAYOUTS[look.id % LAYOUTS.length];
    const itemIds = JSON.parse(look.item_ids);
    const items = itemIds.map((id) => db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id)).filter(Boolean);

    res.json({ look, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get latest look', details: err.message });
  }
});

// GET today's look (generate if none exists yet) — kept for potential future use
router.get('/today', async (req, res) => {
  try {
    const ownerId = Number(req.query.ownerId);
    const today = new Date().toISOString().slice(0, 10);
    let look = getTodayLook(ownerId, today);

    if (!look) {
      const generated = await generateLook(ownerId);
      const result = db
        .prepare("INSERT INTO looks (owner_id, date, item_ids, rationale, status) VALUES (?, ?, ?, ?, 'shown')")
        .run(ownerId, today, JSON.stringify(generated.item_ids), generated.rationale);
      look = db.prepare('SELECT * FROM looks WHERE id = ?').get(Number(result.lastInsertRowid));
      look.layout = generated.layout;
    } else {
      look.layout = LAYOUTS[look.id % LAYOUTS.length];
    }

    const itemIds = JSON.parse(look.item_ids);
    const items = itemIds.map((id) => db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id)).filter(Boolean);

    res.json({ look, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get look', details: err.message });
  }
});

// GET all past looks for this user, most recent first, with their items
router.get('/history', (req, res) => {
  try {
    const ownerId = Number(req.query.ownerId);
    const limit = Number(req.query.limit) || 50;
    const looks = db
      .prepare('SELECT * FROM looks WHERE owner_id = ? ORDER BY id DESC LIMIT ?')
      .all(ownerId, limit);

    const result = looks.map((look) => {
      look.layout = LAYOUTS[look.id % LAYOUTS.length];
      const itemIds = JSON.parse(look.item_ids);
      const items = itemIds.map((id) => db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id)).filter(Boolean);
      return { look, items };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get look history', details: err.message });
  }
});

// GET the current (live) preference summary
router.get('/preference-summary', (req, res) => {
  try {
    const ownerId = Number(req.query.ownerId);
    const profile = getStyleProfile(ownerId);
    res.json({ preference_summary: profile?.preference_summary || '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get preference summary', details: err.message });
  }
});

// Edit the current (live) preference summary
router.put('/preference-summary', (req, res) => {
  try {
    const { ownerId, summary } = req.body;
    db.prepare('UPDATE style_profile SET preference_summary = ? WHERE owner_id = ?').run(summary, ownerId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update preference summary', details: err.message });
  }
});

// GET worn outfit catalog (with resolved wardrobe items)
router.get('/worn-outfits', (req, res) => {
  try {
    const ownerId = Number(req.query.ownerId);
    const rows = db.prepare('SELECT * FROM worn_outfits WHERE owner_id = ? ORDER BY id DESC').all(ownerId);
    const result = rows.map((row) => {
      const itemIds = JSON.parse(row.item_ids || '[]');
      const items = itemIds.map((id) => db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id)).filter(Boolean);
      return { outfit: row, items };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get worn outfits', details: err.message });
  }
});

// Save a worn outfit (after items are matched/added) and optionally record feedback
router.post('/worn-outfits', async (req, res) => {
  try {
    const { ownerId, photoUrl, itemIds, status, note } = req.body;
    const date = new Date().toISOString().slice(0, 10);
    const result = db
      .prepare('INSERT INTO worn_outfits (owner_id, photo_url, date, item_ids, status, note) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ownerId, photoUrl || null, date, JSON.stringify(itemIds || []), status || null, note || null);

    if (status) {
      await recordPreferenceSignal(ownerId, null, JSON.stringify(itemIds || []), status, note);
    }

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save worn outfit', details: err.message });
  }
});

// GET history of preference summaries (how the learned profile has evolved)
router.get('/preference-history', (req, res) => {
  try {
    const ownerId = Number(req.query.ownerId);
    const rows = db
      .prepare('SELECT * FROM preference_summary_history WHERE owner_id = ? ORDER BY id DESC')
      .all(ownerId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get preference history', details: err.message });
  }
});

// Generate a brand new look (used both for "Generate another" and the very first look)
router.post('/regenerate', async (req, res) => {
  try {
    const { ownerId } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    // mark any previous "shown" look for today as regenerated (no-op if none exists)
    db.prepare("UPDATE looks SET status = 'regenerated' WHERE owner_id = ? AND date = ? AND status = 'shown'").run(ownerId, today);

    const prev = db.prepare('SELECT item_ids FROM looks WHERE owner_id = ? ORDER BY id DESC LIMIT 1').all(ownerId);
    const excludeIds = prev.length ? JSON.parse(prev[0].item_ids) : [];

    const generated = await generateLook(ownerId, excludeIds);
    const result = db
      .prepare("INSERT INTO looks (owner_id, date, item_ids, rationale, status) VALUES (?, ?, ?, ?, 'shown')")
      .run(ownerId, today, JSON.stringify(generated.item_ids), generated.rationale);
    const look = db.prepare('SELECT * FROM looks WHERE id = ?').get(Number(result.lastInsertRowid));
    look.layout = generated.layout;

    const itemIds = JSON.parse(look.item_ids);
    const items = itemIds.map((id) => db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id)).filter(Boolean);

    res.json({ look, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to regenerate look', details: err.message });
  }
});

// Record a preference signal (from look feedback or a worn outfit) and periodically refresh the summary
async function recordPreferenceSignal(ownerId, lookId, itemIds, status, note) {
  db.prepare('INSERT INTO preference_signals (owner_id, look_id, item_ids, status, note) VALUES (?, ?, ?, ?, ?)').run(
    ownerId,
    lookId,
    itemIds,
    status,
    note || null
  );

  // Periodically (every 3 feedback entries) regenerate the preference summary
  const count = db.prepare('SELECT COUNT(*) as c FROM preference_signals WHERE owner_id = ?').get(ownerId).c;
  if (count % 3 === 0) {
    await refreshPreferenceSummary(ownerId);
  }
}

// Submit feedback (love this / not for me) and update preference summary
router.post('/feedback', async (req, res) => {
  try {
    const { lookId, ownerId, status, note } = req.body; // status: 'loved' | 'not_for_me'
    db.prepare('UPDATE looks SET status = ?, feedback_note = ? WHERE id = ?').run(status, note || null, lookId);

    const look = db.prepare('SELECT * FROM looks WHERE id = ?').get(lookId);
    await recordPreferenceSignal(ownerId, lookId, look.item_ids, status, note);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save feedback', details: err.message });
  }
});

async function refreshPreferenceSummary(ownerId) {
  const signals = db
    .prepare('SELECT * FROM preference_signals WHERE owner_id = ? ORDER BY id DESC LIMIT 30')
    .all(ownerId);

  const wardrobe = getWardrobe(ownerId);
  const itemMap = Object.fromEntries(wardrobe.map((w) => [w.id, w]));

  const describeSignal = (s) => {
    const ids = JSON.parse(s.item_ids);
    const items = ids.map((id) => itemMap[id]?.name || `item ${id}`).join(', ');
    return `${s.status === 'loved' ? 'LOVED' : 'DISLIKED'}: ${items}${s.note ? ` (note: ${s.note})` : ''}`;
  };

  const prompt = `Based on this feedback history from a personal stylist app, write a short (2-4 sentence) summary of patterns in what this person tends to love vs. avoid in outfit combinations — focus on color combos, formality levels, and item pairings. Be specific and concise.

FEEDBACK HISTORY:
${signals.map(describeSignal).join('\n')}

Respond with plain text only, no preamble.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const summary = message.content[0].text.trim();
  db.prepare('UPDATE style_profile SET preference_summary = ? WHERE owner_id = ?').run(summary, ownerId);

  // Keep a dated history of how the preference summary has evolved
  const signalCount = db.prepare('SELECT COUNT(*) as c FROM preference_signals WHERE owner_id = ?').get(ownerId).c;
  db.prepare('INSERT INTO preference_summary_history (owner_id, summary, based_on_signal_count) VALUES (?, ?, ?)').run(
    ownerId,
    summary,
    signalCount
  );
}

export default router;
