import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import companiesRouter from './routes/companies.js';
import uploadRouter from './routes/upload.js';
import { startWatcher } from './watcher.js';
import { getDb, getMeta, setMeta } from './db.js';
import { syncFromGoogleSheet, startSheetPoller, stopSheetPoller } from './sheetsSync.js';

const app = express();
const PORT = process.env.PORT || 3001;
// Poll interval — default 5 minutes, override via SHEETS_POLL_INTERVAL_MS in .env
const POLL_INTERVAL_MS = parseInt(process.env.SHEETS_POLL_INTERVAL_MS || '300000');

// ─── Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── SSE for live updates ─────────────────────────────────────────────────
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch {}
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

function broadcastUpdate(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch {}
  }
}

// ─── Google Sheets routes ─────────────────────────────────────────────────

// GET /api/sheets/status
app.get('/api/sheets/status', (req, res) => {
  const url = getMeta('sheets_url');
  const lastSync = getMeta('sheets_last_sync');
  res.json({ configured: !!url, url, lastSync });
});

// POST /api/sheets/configure  { url, pollIntervalMs? }
app.post('/api/sheets/configure', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes('docs.google.com/spreadsheets')) {
    return res.status(400).json({ error: 'Invalid Google Sheets URL' });
  }
  setMeta('sheets_url', url);

  // Kick off an immediate sync
  try {
    const count = await syncFromGoogleSheet(url, (n) => {
      broadcastUpdate('data-updated', { count: n, timestamp: new Date().toISOString() });
    });

    // (Re)start the poller with the new URL stored in DB
    startSheetPoller(POLL_INTERVAL_MS, (n) => {
      broadcastUpdate('data-updated', { count: n, timestamp: new Date().toISOString() });
    });

    res.json({ success: true, count, message: `Synced ${count} companies. Auto-polling every ${Math.round(POLL_INTERVAL_MS / 60000)} min.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sheets/sync  — manual re-sync now
app.post('/api/sheets/sync', async (req, res) => {
  try {
    const count = await syncFromGoogleSheet(null, (n) => {
      broadcastUpdate('data-updated', { count: n, timestamp: new Date().toISOString() });
    });
    res.json({ success: true, count, lastSync: getMeta('sheets_last_sync') });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/companies', companiesRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as n FROM companies').get();
  res.json({ ok: true, companies: count.n, timestamp: new Date().toISOString() });
});

// ─── Start ────────────────────────────────────────────────────────────────
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 PS1 Explorer API running on http://localhost:${PORT}`);

  // Auto-start Google Sheets poller if URL was previously configured
  const existingSheetsUrl = getMeta('sheets_url');
  if (existingSheetsUrl) {
    console.log(`[SheetsSync] Resuming sync for stored URL`);
    startSheetPoller(POLL_INTERVAL_MS, (n) => {
      broadcastUpdate('data-updated', { count: n, timestamp: new Date().toISOString() });
    });
  }

  // File watcher (optional, for local file watching)
  const watchPath = process.env.WATCH_FILE_PATH;
  if (watchPath) {
    startWatcher(watchPath, (count) => {
      broadcastUpdate('data-updated', { count, timestamp: new Date().toISOString() });
    });
  }
});

process.on('SIGTERM', () => { stopSheetPoller(); server.close(); process.exit(0); });
process.on('SIGINT', () => { stopSheetPoller(); server.close(); process.exit(0); });
