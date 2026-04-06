import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseFile, parseCsv } from '../parser.js';
import { getMeta } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../data/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `companies_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

const router = Router();

// POST /api/upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let count;
    if (ext === '.csv') {
      const csvText = fs.readFileSync(filePath, 'utf-8');
      count = parseCsv(csvText);
    } else {
      count = parseFile(filePath);
    }

    res.json({
      success: true,
      message: `Successfully loaded ${count} companies`,
      count,
      filename: req.file.originalname
    });
  } catch (err) {
    console.error('[Upload] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/refresh — re-parse the watched file
router.post('/refresh', (req, res) => {
  try {
    const watchPath = getMeta('watch_file_path');
    if (!watchPath || !fs.existsSync(watchPath)) {
      return res.status(404).json({ error: 'No watched file to refresh. Please upload a file first.' });
    }
    const count = parseFile(watchPath);
    res.json({ success: true, count, message: `Refreshed ${count} companies` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
