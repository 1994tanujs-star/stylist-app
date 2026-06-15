import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './db.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import wardrobeRoutes from './routes/wardrobe.js';
import looksRoutes from './routes/looks.js';
import inspirationRoutes from './routes/inspiration.js';
import { requireAuth } from './session.js';

dotenv.config();
// Idempotent: populates a fresh DB (e.g. a newly-mounted Railway volume) with
// the default users + Sagorika's seed wardrobe; no-ops once data exists.
seed();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Lock CORS to a known origin. The frontend is served same-origin in production,
// so cross-origin requests are disallowed by default; set ALLOWED_ORIGIN only if
// you host the frontend separately. `credentials` is required for the cookie.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors({ origin: allowedOrigin || false, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
// Per-user photo access: only the uploader may fetch a file. The session cookie
// rides along on <img> requests because everything is same-origin.
app.get('/uploads/:file', requireAuth, (req, res) => {
  const file = path.basename(req.params.file); // strip any path traversal
  const rel = `/uploads/${file}`;
  // Owned if the user uploaded it (new flow) OR it's referenced by one of their
  // wardrobe items / worn outfits (covers photos saved before the uploads table existed).
  const owns =
    db.prepare('SELECT 1 FROM uploads WHERE filename = ? AND owner_id = ? LIMIT 1').get(file, req.userId) ||
    db.prepare('SELECT 1 FROM wardrobe_items WHERE owner_id = ? AND photo_url = ? LIMIT 1').get(req.userId, rel) ||
    db.prepare('SELECT 1 FROM worn_outfits WHERE owner_id = ? AND photo_url = ? LIMIT 1').get(req.userId, rel) ||
    db.prepare('SELECT 1 FROM inspiration_looks WHERE owner_id = ? AND photo_url = ? LIMIT 1').get(req.userId, rel);
  if (!owns) return res.status(404).end();
  res.sendFile(path.join(uploadsDir, file), (err) => {
    if (err) res.status(404).end(); // file row exists but bytes are gone (e.g. wiped on redeploy)
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', requireAuth, wardrobeRoutes);
app.use('/api/looks', requireAuth, looksRoutes);
app.use('/api/inspiration', requireAuth, inspirationRoutes);

// Serve built frontend in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built yet. Run npm run build in frontend/.');
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Stylist app backend running on port ${PORT}`));
