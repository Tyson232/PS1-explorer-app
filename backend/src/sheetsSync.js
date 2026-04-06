import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile } from './parser.js';
import { getMeta, setMeta } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../../data/sheets_cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// Extract sheet ID and gid from any Google Sheets URL
function parseSheetUrl(url) {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  if (!idMatch) throw new Error('Could not parse Google Sheets URL');
  return {
    sheetId: idMatch[1],
    gid: gidMatch ? gidMatch[1] : '0'
  };
}

function buildExportUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=${gid}`;
}

export async function syncFromGoogleSheet(sheetsUrl, onUpdate) {
  if (!sheetsUrl) sheetsUrl = getMeta('sheets_url');
  if (!sheetsUrl) throw new Error('No Google Sheets URL configured');

  const { sheetId, gid } = parseSheetUrl(sheetsUrl);
  const exportUrl = buildExportUrl(sheetId, gid);

  console.log(`[SheetsSync] Downloading from: ${exportUrl}`);

  const response = await axios.get(exportUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxRedirects: 5
  });

  if (response.status !== 200) {
    throw new Error(`Google Sheets returned HTTP ${response.status}. Make sure the sheet is set to "Anyone with link can view".`);
  }

  // Check it's actually an xlsx (not an HTML error page)
  const buf = Buffer.from(response.data);
  const isXlsx = buf[0] === 0x50 && buf[1] === 0x4B; // PK magic bytes (zip)
  if (!isXlsx) {
    const text = buf.toString('utf8', 0, 200);
    if (text.includes('Sign in') || text.includes('accounts.google')) {
      throw new Error('Sheet is not public. Share it as "Anyone with the link → Viewer" first.');
    }
    throw new Error('Downloaded file does not look like a valid Excel file.');
  }

  // Save to cache
  const cachePath = path.join(CACHE_DIR, `sheet_${sheetId}_${gid}.xlsx`);
  fs.writeFileSync(cachePath, buf);

  // Parse into DB
  const count = parseFile(cachePath);
  setMeta('sheets_url', sheetsUrl);
  setMeta('sheets_last_sync', new Date().toISOString());

  console.log(`[SheetsSync] Synced ${count} companies from Google Sheets`);
  if (onUpdate) onUpdate(count);
  return count;
}

// ─── Polling ──────────────────────────────────────────────────────────────

let pollTimer = null;

export function startSheetPoller(intervalMs, onUpdate) {
  if (pollTimer) clearInterval(pollTimer);

  // Run immediately on start
  syncFromGoogleSheet(null, onUpdate).catch(err =>
    console.warn('[SheetsSync] Initial sync failed:', err.message)
  );

  pollTimer = setInterval(() => {
    syncFromGoogleSheet(null, onUpdate).catch(err =>
      console.warn('[SheetsSync] Scheduled sync failed:', err.message)
    );
  }, intervalMs);

  console.log(`[SheetsSync] Polling every ${Math.round(intervalMs / 60000)} min`);
}

export function stopSheetPoller() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
