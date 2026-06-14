# Daily Stylist App — Handoff Doc

Context for continuing work on this project in a new chat/session. Paste this doc into the new conversation so Claude can pick up without re-explaining everything.

## What this project is

A personal stylist PWA for the user's wife (Sagorika), built on top of a style guide derived from her Zara/H&M order history and Instagram influencer references. It's a Phase 1 MVP, already built and working.

- `frontend/` — React + Vite + Tailwind v4 PWA
- `backend/` — Express 5 + Node's built-in `node:sqlite` (DatabaseSync)
- Two users with PIN auth: Sagorika (1234), Tanuj (5678) — stored in `users` table
- AI features (wardrobe tagging, daily look generation, preference summarization) use the Anthropic SDK, model `claude-sonnet-4-6`

## Current feature set (all implemented)

1. **Wardrobe**: upload item photo → Claude vision auto-tags category/colors/pattern/fabric/formality → review/save. CRUD in `backend/src/routes/wardrobe.js`, UI in `frontend/src/Wardrobe.jsx`.
2. **Daily Look**: Claude picks 3–5 wardrobe items based on style profile + learned preferences, rendered as a code-generated "flat-lay" (no paid image gen) — 3 layout variants (`stacked`, `spread`, `sidebyside`) in `frontend/src/FlatLay.jsx`.
3. **Lazy loading (just added)**: On app load, `TodaysLook.jsx` calls `GET /looks/latest` — shows the most recently generated look with **no AI call**. A new look is only generated when the user taps "Generate my look" / "Generate another look" (calls `POST /looks/regenerate`).
4. **Feedback loop**: "Love this" / "Not for me" buttons → logged to `preference_signals`. Every 3rd feedback entry triggers `refreshPreferenceSummary()` in `backend/src/routes/looks.js`, which calls Claude to update `style_profile.preference_summary`.
5. **History tab (just added)**: New 3rd nav tab (`frontend/src/History.jsx`) with two sub-tabs:
   - **Past Looks** — calls `GET /looks/history`, shows flat-lays + date + status + rationale for all past looks
   - **Preferences** — calls `GET /looks/preference-history`, shows the dated evolution of `preference_summary` (new `preference_summary_history` table, populated every time the summary refreshes)
6. PWA: installable to home screen, manifest theme color `#f7f3ee`.

## Key files

- `backend/src/db.js` — schema (tables: `users`, `wardrobe_items`, `style_profile`, `looks`, `preference_signals`, `preference_summary_history`). Supports `DB_PATH` env override.
- `backend/src/routes/looks.js` — look generation, `/latest`, `/today`, `/history`, `/preference-history`, `/regenerate`, `/feedback`, `refreshPreferenceSummary()`
- `backend/src/routes/wardrobe.js`, `backend/src/routes/auth.js`
- `backend/src/anthropic.js` — exports `anthropic` client + `MODEL = 'claude-sonnet-4-6'`
- `backend/.env` — contains `ANTHROPIC_API_KEY` and `PORT=4000`. **Gitignored, never commit or echo this.**
- `frontend/src/api.js`, `App.jsx`, `TodaysLook.jsx`, `Wardrobe.jsx`, `History.jsx`, `FlatLay.jsx`, `Login.jsx`
- `backend/src/seed.js` — seeds 2 users + style profile + 20 wardrobe items from order history
- `README.md` — setup/run/build/deploy instructions

## Build/run

```bash
cd backend && npm install && npm run seed && npm start   # backend on :4000
cd frontend && npm install && npm run dev                # dev server, proxies /api to :4000
```

Production: `cd frontend && npm run build` then `cd backend && npm start` serves everything from `:4000`.

Note: in the sandbox environment, `npm run build`'s default `dist` cleanup can hit `EPERM` on the mounted output folder. Workaround used: `npx vite build --outDir /tmp/dist-build --emptyOutDir` then `cp -r /tmp/dist-build/. dist/` (overwrite without deleting). Not needed on the user's own machine.

## Decisions already made (don't re-litigate)

- No push notifications
- "For You" shopping recommendations deferred to Phase 2
- Flat-lay images are code-generated layouts from the user's own item photos — no paid AI image generation
- Free hosting is acceptable
- 30-item onboarding wardrobe seed
- `node:sqlite` instead of `better-sqlite3` (native build fails in sandbox)

## Plans discussed but NOT yet implemented (user said "plan only" for these)

1. **Publishing to a real hosted endpoint** accessible from phone (Render/Railway/Fly.io — see README's deploy section for the basic outline)
2. **Iteration workflow**: local test → git push → auto-deploy via the host
3. **Image storage**: currently `backend/uploads/`, needs a persistent volume on whatever host is chosen
4. **Auth/security hardening** before going public (current PIN auth is basic; needs rate limiting, maybe stronger secrets, HTTPS via host)

## Possible future improvements (offered, not requested yet)

- Reason chips when disliking a look (e.g. "too formal", "don't like color combo")
- "Worn it" tracking
- Periodic human check-in/edit on the AI preference summary
- More wardrobe items → better variety
- Recency weighting in preference learning
- Weather-aware / occasion-based suggestions (Phase 2)

## Sensitive info

- Anthropic API key lives in `backend/.env` — already gitignored. Never display or commit it.
