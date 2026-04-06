// Shared in-memory store for Vercel serverless functions
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load bundled company data (pre-exported from SQLite)
function loadCompanies() {
  try {
    const raw = readFileSync(join(__dirname, '../data/companies.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
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
