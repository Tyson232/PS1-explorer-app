// Shared in-memory store for Vercel serverless functions
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load bundled company data (pre-exported from SQLite)
function loadCompanies() {
  // Try same directory first (Vercel deployment), then ../data (local dev)
  const paths = [
    join(__dirname, 'companies_data.json'),
    join(__dirname, '../data/companies.json'),
  ];
  for (const p of paths) {
    try {
      const raw = readFileSync(p, 'utf-8');
      const data = JSON.parse(raw);
      console.log(`[Data] Loaded ${data.length} companies from ${p}`);
      return data;
    } catch {}
  }
  console.warn('[Data] No companies.json found');
  return [];
}

// Module-level store — survives across requests in the same warm lambda
let _companies = loadCompanies();
let _lastUpdated = new Date().toISOString();

export function getCompanies() { return _companies; }
export function getLastUpdated() { return _lastUpdated; }

export function setCompanies(companies) {
  _companies = companies;
  _lastUpdated = new Date().toISOString();
}

// Enrichment cache — in-memory, persists across warm invocations
export const enrichmentCache = new Map();
