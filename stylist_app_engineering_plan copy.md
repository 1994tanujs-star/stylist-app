# Engineering Plan: Daily Stylist App (v1 / Phase 1)

Companion to `stylist_app_product_doc.md` (approved). This covers data model, tech stack, AI pipeline, and build steps for Phase 1.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite, PWA (manifest + service worker) | Fast to build, installs to home screen on iOS/Android, single codebase |
| Styling | Tailwind CSS | Quick to make it look polished |
| Backend | Node.js (Express) or simple serverless functions | Lightweight API for wardrobe CRUD + look generation |
| Database | SQLite (file-based) or a managed Postgres (e.g. Supabase free tier) | Small dataset (~30 items, 2 users) — SQLite is enough, Supabase if we want easy hosting + image storage together |
| Image storage | Same host as DB (Supabase Storage) or simple cloud bucket | Stores wardrobe item photos + generated flat-lay images |
| AI tagging (vision) | Claude (vision) via API | Tags uploaded item photos: category, color, pattern, fabric, formality |
| AI look generation (text/logic) | Claude via API | Picks item combinations based on style profile + tagged wardrobe |
| Look visual (Phase 1 default) | Code-generated flat-lay layout (CSS/Canvas, using her real item photos) | $0 cost. Arranges her uploaded photos into a styled, color-coordinated mood-board layout — polished template, not AI-generated |
| AI flat-lay image generation (optional, later) | Image generation model (e.g. Gemini/Imagen or GPT-image via API) | Upgrade path if/when we want fully AI-generated editorial visuals (~$1-7/month) |
| Hosting | Single small host (Render/Railway/Fly.io free-ish tier) | One deployment, low traffic, 2 users |
| Auth | Shared passcode per user (2 simple PIN-protected profiles) | Per product doc — no full account system |

---

## 2. Data Model

**users**
- id, name ("Sagorika" / "Tanuj"), passcode_hash

**wardrobe_items**
- id, owner_id
- photo_url
- category (top / bottom / dress / outerwear / shoes / accessory)
- color(s)
- pattern
- fabric
- formality (casual / work / occasion)
- notes (free text — "gift from mom", "needs dry clean")
- source (manual / seed-from-order-history)
- created_at

**style_profile** (seeded once from `sagorika_style_guide.md`, editable later)
- owner_id
- aesthetic_keywords (relaxed feminine, coastal casual, etc.)
- color_palette (neutrals, pastels, earthy accents)
- preferred_silhouettes
- influencer_references (handles, for prompt context)

**looks** (generated outfit suggestions)
- id, owner_id, date
- item_ids (array, 3-5 items)
- flat_lay_image_url (or layout_data, if code-generated)
- status (shown / regenerated / loved / not_for_me)
- feedback_note (optional free text, e.g. "too formal for daily wear")
- created_at

**preference_signals** (derived from feedback, used to bias future picks)
- owner_id
- item_id, co_occurring_item_ids — pairs/combos that were loved or rejected together
- attribute_scores — running tally of liked vs. disliked: colors, categories, formality levels, silhouette combos
- updated_at

---

## 3. Core Pipelines

### 3.1 Wardrobe Onboarding
1. User uploads item photo (mobile camera or gallery)
2. Backend sends photo to Claude vision → returns category, color, pattern, fabric, formality
3. User reviews/edits tags in a confirm screen → saves to `wardrobe_items`
4. Seed data: ~20 items from Zara/H&M order history pre-populated as rows (no photo yet); flagged so the UI prompts "add a photo for this item" until completed

### 3.2 Daily Look Generation
1. On app open, check if a `look` exists for today for this user → if yes, show it
2. If no: backend calls Claude with:
   - Full tagged wardrobe (categories, colors, patterns, formality)
   - `style_profile` (aesthetic, palette, silhouettes, influencer references)
   - Instruction: pick 3-5 items forming one cohesive outfit matching her style
3. Claude returns chosen item IDs + a short styling rationale
4. Backend calls image generation model with: item photos (as reference images) + item descriptions + style profile keywords + flat-lay/editorial prompt template
5. Generated image + item list saved as a `look`, shown to user

### 3.3 Regenerate ("Generate another")
- Same as 3.2 but excludes the just-shown item combination, optionally passes "Love this / Not for me" feedback as additional prompt context to bias future picks

---

## 4. Look Visual Approach (Phase 1 default — free)

Instead of AI-generated images, the suggested look is rendered as a styled flat-lay layout built from her own uploaded item photos:
- Items arranged on a clean canvas (top item upper-center, bottom item below, shoes/accessories to the sides) — a real flat-lay composition, not a row of thumbnails
- Background color/texture chosen to complement the outfit's palette (soft neutrals/pastels per her style profile)
- Subtle shadows, consistent spacing, and a small caption with the styling rationale (e.g. "Soft pastels + wide-leg trousers — easy weekday look")
- Built with HTML/CSS (or Canvas) templates — a handful of layout variants so it doesn't feel repetitive

**Optional future upgrade (Phase 2+):** swap this renderer for AI image generation (~$1-7/month) for fully editorial visuals — the data model and pipeline already support this since `flat_lay_image_url` works for either approach.

---

## 5. Feedback Loop — Learning Her Preferences

Goal: over time, the app should notice patterns in what she loves vs. skips, and weight future suggestions accordingly.

**How it works:**
1. Every look shown gets logged with its item combination and any "Love this" / "Not for me" tap (and optional short note)
2. After each piece of feedback, `preference_signals` is updated:
   - Loved combos → increase affinity score for that item pairing, and for the attributes involved (color combo, formality level, category mix)
   - Rejected combos → decrease affinity for that pairing/attributes (but don't penalize individual items too harshly from one rejection — only patterns that repeat)
3. When generating a new look, the Claude prompt includes a summary of top-scoring and low-scoring patterns ("she tends to love pastel-on-neutral pairings and skip anything with the blazer + structured trousers combo") alongside the static style profile
4. Over time this summary evolves — the static `style_profile` (from influencer/purchase history) becomes the starting point, and `preference_signals` becomes the personalization layer on top

**Lightweight v1 approach:** rather than a full ML model, this is just structured feedback data + a periodically-regenerated text summary fed into the prompt — cheap, transparent, and easy to inspect/adjust if it gets something wrong.

---

## 6. Build Steps (Phase 1)

1. **Project setup** — React+Vite PWA scaffold, Tailwind, basic routing (Wardrobe / Today's Look / Login)
2. **Passcode auth** — simple PIN screen, two profiles
3. **Database + storage setup** — schema above, image storage bucket
4. **Wardrobe CRUD UI** — add item (photo upload), AI tagging call, edit/confirm tags, grid view with filters
5. **Seed data import** — load ~20 items from order history metadata into `wardrobe_items`
6. **Style profile seed** — load `sagorika_style_guide.md` content into `style_profile`
7. **Daily look generation backend** — Claude call for item selection (using style profile + preference signals) + code-based flat-lay layout renderer
8. **Today's Look UI** — display layout, item list, "Generate another", "Love this / Not for me" + optional note
9. **Feedback loop** — log feedback, update `preference_signals`, periodic summary regeneration
10. **PWA polish** — manifest, icons, "Add to Home Screen" prompt, offline fallback for cached looks
11. **Test pass** — both profiles, full onboarding flow, regenerate flow, feedback loop check

---

## 7. Open Items for Your Review

1. **AI provider key:** Needs Claude API access for tagging + look-selection logic (cost: a few cents/month). No existing key — you'll need to sign up at console.anthropic.com, add a card (pay-as-you-go), and generate an API key. Takes ~5 minutes; I can walk you through it when we get there.
2. **Hosting:** Free/low-cost host (Render/Railway/Supabase) for v1, under your name. ✅ Confirmed.
3. **Confirm:** Phase 1 ships with the code-generated flat-lay layout (free), with AI image generation as a future opt-in upgrade. ✅ Confirmed.

---

Once approved, I'll start with steps 1-3 (project setup, auth, database) and check in with progress.
