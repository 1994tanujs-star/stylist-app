import { fileURLToPath } from 'url';
import { db, ensureUsers } from './db.js';

// Idempotent: safe to run on every boot. Seeds the default users, Sagorika's
// style profile, and her order-history wardrobe — but only if they're missing.
export function seed() {
ensureUsers();

const sagorika = db.prepare("SELECT id FROM users WHERE name = 'Sagorika'").get();
const ownerId = sagorika.id;

// --- Style profile, derived from sagorika_style_guide.md ---
const existingProfile = db.prepare('SELECT id FROM style_profile WHERE owner_id = ?').get(ownerId);
if (!existingProfile) {
  db.prepare(
    `INSERT INTO style_profile (owner_id, aesthetic_keywords, color_palette, preferred_silhouettes, influencer_references)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    ownerId,
    'Relaxed feminine, coastal casual, soft neutral base, easy dressing, effortless comfort-chic',
    'Neutrals (oyster white, ecru, beige marl, anthracite grey, black); soft pastels (pastel yellow, powder pink, dusty pink, light pink, light blue); earthy accents (burgundy, dark brown, washed denim blue); patterns: polka dot, white/blue print',
    'Wide-leg and flowing trousers, midi skirts, halter neck and long dresses, soft knit/ribbed tops and cardigans, basic vest tops and t-shirts as layers. Prefers drape over structured/stiff fabric.',
    '@cailinmandapat (sarongs, sundresses, espadrilles, leather bags), @ciarakeva (relaxed coats, barista-chic everyday looks), @alishajain_05 (floral skirts + linen blouses for work)'
  );
  console.log('Style profile seeded for Sagorika');
}

// --- Seed wardrobe items from order history (no photos yet) ---
const existingItems = db.prepare('SELECT COUNT(*) as c FROM wardrobe_items WHERE owner_id = ?').get(ownerId).c;

if (existingItems === 0) {
  const items = [
    { name: 'Wide-leg trousers (beige)', category: 'bottom', colors: 'beige', pattern: 'solid', fabric: 'linen-blend', formality: 'casual' },
    { name: 'Wide-leg trousers (anthracite grey)', category: 'bottom', colors: 'anthracite grey', pattern: 'solid', fabric: 'polyamide', formality: 'work' },
    { name: 'Wide-leg trousers (ecru)', category: 'bottom', colors: 'ecru', pattern: 'solid', fabric: 'cotton poplin', formality: 'casual' },
    { name: 'Flowing trousers (black)', category: 'bottom', colors: 'black', pattern: 'solid', fabric: 'satin', formality: 'work' },
    { name: 'Flowing trousers (oyster white)', category: 'bottom', colors: 'oyster white', pattern: 'solid', fabric: 'linen-blend', formality: 'casual' },
    { name: 'Ribbed knit top (powder pink)', category: 'top', colors: 'powder pink', pattern: 'solid', fabric: 'knit', formality: 'casual' },
    { name: 'Ribbed knit top (light blue)', category: 'top', colors: 'light blue', pattern: 'solid', fabric: 'knit', formality: 'casual' },
    { name: 'Soft cardigan (ecru)', category: 'top', colors: 'ecru', pattern: 'solid', fabric: 'knit', formality: 'casual' },
    { name: 'Basic vest top (black)', category: 'top', colors: 'black', pattern: 'solid', fabric: 'jersey', formality: 'casual' },
    { name: 'Basic vest top (white)', category: 'top', colors: 'white', pattern: 'solid', fabric: 'jersey', formality: 'casual' },
    { name: 'Basic t-shirt (dusty pink)', category: 'top', colors: 'dusty pink', pattern: 'solid', fabric: 'cotton', formality: 'casual' },
    { name: 'Midi skirt (pastel yellow)', category: 'bottom', colors: 'pastel yellow', pattern: 'solid', fabric: 'jersey', formality: 'casual' },
    { name: 'Midi skirt (polka dot, ecru/black)', category: 'bottom', colors: 'ecru, black', pattern: 'polka dot', fabric: 'cotton poplin', formality: 'casual' },
    { name: 'Halter neck dress (light pink)', category: 'dress', colors: 'light pink', pattern: 'solid', fabric: 'satin', formality: 'occasion' },
    { name: 'Long dress (white/blue print)', category: 'dress', colors: 'white, blue', pattern: 'print', fabric: 'cotton', formality: 'casual' },
    { name: 'Flared high jeans (washed denim blue)', category: 'bottom', colors: 'washed denim blue', pattern: 'solid', fabric: 'denim', formality: 'casual' },
    { name: 'Soft seamless bra (black)', category: 'accessory', colors: 'black', pattern: 'solid', fabric: 'jersey', formality: 'casual' },
    { name: 'Soft seamless bra (beige)', category: 'accessory', colors: 'beige', pattern: 'solid', fabric: 'jersey', formality: 'casual' },
    { name: 'Narrow belt (dark brown croc-print)', category: 'accessory', colors: 'dark brown', pattern: 'croc-print', fabric: 'faux leather', formality: 'work' },
    { name: 'Ribbed knit top (pale yellow)', category: 'top', colors: 'pale yellow', pattern: 'solid', fabric: 'knit', formality: 'casual' },
  ];

  const insert = db.prepare(
    `INSERT INTO wardrobe_items (owner_id, name, category, colors, pattern, fabric, formality, source, needs_photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'seed-from-order-history', 1)`
  );
  for (const item of items) {
    insert.run(ownerId, item.name, item.category, item.colors, item.pattern, item.fabric, item.formality);
  }
  console.log(`Seeded ${items.length} wardrobe items for Sagorika (photos still needed)`);
} else {
  console.log('Wardrobe items already seeded, skipping.');
}
}

// Allow running directly: `npm run seed` / `node src/seed.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed();
}
