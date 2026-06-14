import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, ensureUsers } from './db.js';
import authRoutes from './routes/auth.js';
import wardrobeRoutes from './routes/wardrobe.js';
import looksRoutes from './routes/looks.js';

dotenv.config();
ensureUsers();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/looks', looksRoutes);

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
