import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/ps1_explorer.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT,
      normalized_domain TEXT,
      city TEXT,
      project_details TEXT,
      subdomains TEXT DEFAULT '[]',
      raw_row TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
    CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(normalized_domain);

    CREATE TABLE IF NOT EXISTS company_enrichments (
      company_name TEXT PRIMARY KEY,
      scale_badge TEXT,
      employee_count TEXT,
      description TEXT,
      founding_year TEXT,
      hq TEXT,
      website TEXT,
      funding_stage TEXT,
      investors TEXT,
      tech_stack TEXT,
      culture_snippet TEXT,
      linkedin_url TEXT,
      fetched_at INTEGER DEFAULT (strftime('%s','now')),
      fetch_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS file_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// ─── Company Operations ────────────────────────────────────────────────────

export function upsertCompanies(companies) {
  const database = getDb();
  database.exec('DELETE FROM companies');

  const insert = database.prepare(`
    INSERT INTO companies (name, domain, normalized_domain, city, project_details, subdomains, raw_row, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
  `);

  for (const row of companies) {
    insert.run(
      row.name,
      row.domain,
      row.normalized_domain,
      row.city,
      row.project_details,
      row.subdomains,
      row.raw_row
    );
  }
}

export function getAllCompanies() {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM companies ORDER BY name ASC').all();
  return rows.map(parseCompanyRow);
}

export function searchCompanies(query, domainList) {
  const database = getDb();
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const params = [];

  if (query) {
    sql += ` AND (
      name LIKE ? OR
      domain LIKE ? OR
      city LIKE ? OR
      project_details LIKE ?
    )`;
    const q = `%${query}%`;
    params.push(q, q, q, q);
  }

  if (domainList && domainList.length > 0) {
    const placeholders = domainList.map(() => '?').join(',');
    sql += ` AND normalized_domain IN (${placeholders})`;
    params.push(...domainList);
  }

  sql += ' ORDER BY name ASC';

  const rows = database.prepare(sql).all(...params);
  return rows.map(parseCompanyRow);
}

function parseCompanyRow(row) {
  return {
    ...row,
    subdomains: safeJsonParse(row.subdomains, []),
    raw_row: safeJsonParse(row.raw_row, {})
  };
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export function getDomains() {
  const database = getDb();
  return database.prepare(`
    SELECT normalized_domain as domain, COUNT(*) as count
    FROM companies
    GROUP BY normalized_domain
    ORDER BY count DESC
  `).all();
}

export function getSubdomainsByDomain() {
  const database = getDb();
  const companies = database.prepare('SELECT normalized_domain, subdomains FROM companies').all();
  const map = {};
  for (const c of companies) {
    const subs = safeJsonParse(c.subdomains, []);
    if (!map[c.normalized_domain]) map[c.normalized_domain] = new Set();
    subs.forEach(s => map[c.normalized_domain].add(s));
  }
  const result = {};
  for (const [k, v] of Object.entries(map)) {
    result[k] = [...v];
  }
  return result;
}

// ─── Enrichment Operations ────────────────────────────────────────────────

export function getEnrichment(companyName) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM company_enrichments WHERE company_name = ?').get(companyName);
  if (!row) return null;
  return {
    ...row,
    tech_stack: safeJsonParse(row.tech_stack, []),
    investors: safeJsonParse(row.investors, [])
  };
}

export function saveEnrichment(companyName, data) {
  const database = getDb();
  database.prepare(`
    INSERT INTO company_enrichments (
      company_name, scale_badge, employee_count, description, founding_year,
      hq, website, funding_stage, investors, tech_stack, culture_snippet,
      linkedin_url, fetched_at, fetch_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'), ?)
    ON CONFLICT(company_name) DO UPDATE SET
      scale_badge = excluded.scale_badge,
      employee_count = excluded.employee_count,
      description = excluded.description,
      founding_year = excluded.founding_year,
      hq = excluded.hq,
      website = excluded.website,
      funding_stage = excluded.funding_stage,
      investors = excluded.investors,
      tech_stack = excluded.tech_stack,
      culture_snippet = excluded.culture_snippet,
      linkedin_url = excluded.linkedin_url,
      fetched_at = strftime('%s','now'),
      fetch_status = excluded.fetch_status
  `).run(
    companyName,
    data.scale_badge || null,
    data.employee_count || null,
    data.description || null,
    data.founding_year || null,
    data.hq || null,
    data.website || null,
    data.funding_stage || null,
    JSON.stringify(data.investors || []),
    JSON.stringify(data.tech_stack || []),
    data.culture_snippet || null,
    data.linkedin_url || null,
    data.fetch_status || 'done'
  );
}

// ─── File Meta ────────────────────────────────────────────────────────────

export function setMeta(key, value) {
  getDb().prepare(`
    INSERT INTO file_meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function getMeta(key) {
  const row = getDb().prepare('SELECT value FROM file_meta WHERE key = ?').get(key);
  return row ? row.value : null;
}
