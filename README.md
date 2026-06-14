# Daily Stylist App

A personal stylist PWA: digitize your wardrobe, get a daily AI-curated outfit suggestion rendered as a styled flat-lay (built from your own item photos — no paid image generation), regenerate when you want something different, and give feedback so it learns your taste over time.

## What's inside

- `frontend/` — React + Vite + Tailwind PWA
- `backend/` — Express API + SQLite (using Node's built-in `node:sqlite`)

## One-time setup

1. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Add your Anthropic API key**
   `backend/.env` already contains your key. If you ever need to update it:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   PORT=4000
   ```
   We recommend setting a monthly spend limit (e.g. $10) in console.anthropic.com → Billing.

3. **Seed initial data** (default users + Sagorika's wardrobe metadata from order history + style profile)
   ```bash
   cd backend && npm run seed
   ```
   This creates two logins:
   - **Sagorika** — PIN `1234`
   - **Tanuj** — PIN `5678`

   ⚠️ Change these PINs before sharing the app — see "Changing PINs" below.

## Running locally

Open two terminals:

```bash
# Terminal 1 — backend
cd backend && npm start

# Terminal 2 — frontend (dev mode with hot reload)
cd frontend && npm run dev
```

Visit the URL Vite prints (usually http://localhost:5173). The frontend proxies `/api` and `/uploads` to the backend on port 4000.

## Production build

```bash
cd frontend && npm run build
cd ../backend && npm start
```

The backend serves the built frontend at `http://localhost:4000` (or whatever `PORT` is set to) — this is the single URL to deploy.

## Deploying (Render / Railway / Fly.io)

1. Push this folder to a git repo.
2. Create a new Web Service pointing at the repo.
3. Build command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
4. Start command: `cd backend && npm start`
5. Set environment variable `ANTHROPIC_API_KEY` in the host's dashboard (don't commit `.env`).
6. The SQLite DB file (`backend/data/stylist.db`) and uploaded photos (`backend/uploads/`) live on disk — make sure your host has a persistent disk/volume, otherwise data resets on redeploy. Most free tiers offer a small persistent volume you can attach.

## Changing PINs

Edit directly in the database, or temporarily add a small admin script. Simplest: stop the server, then run:
```bash
cd backend
DB_PATH=./data/stylist.db node -e "
import('./src/db.js').then(({db}) => {
  db.prepare('UPDATE users SET passcode = ? WHERE name = ?').run('NEWPIN', 'Sagorika');
  console.log('updated');
});
"
```

## How it works

- **Wardrobe**: upload a photo of an item → Claude (vision) auto-tags category/color/pattern/fabric/formality → review/confirm → saved.
- **Today's Look**: Claude picks 3-5 items from the wardrobe based on the style profile + learned preferences, then the app renders a flat-lay composition (one of a few layout templates) using the actual item photos — no AI image generation, so no extra image cost.
- **Regenerate**: asks Claude for a different combination, avoiding the one just shown.
- **Feedback**: "Love this" / "Not for me" is logged; every 3 pieces of feedback, Claude summarizes patterns into a short preference note that's fed into future look generation.

## Notes / Phase 2 ideas (not built yet)

- Weather-aware suggestions
- Occasion-based requests
- Wear history tracking
- "For You" shopping tab (sale picks from Zara/H&M/Myntra)
- Optional upgrade: swap the flat-lay renderer for AI-generated editorial images
