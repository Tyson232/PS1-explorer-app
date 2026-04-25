#!/usr/bin/env node
/**
 * Imports new stations from "scripts/brand new.xlsx" into companies_data.json
 * and the SQLite DB. Marks them with is_newly_added: true and station_mode so
 * they appear in the "Newly Added" filter and split correctly by Online/Onsite.
 *
 * brand new.xlsx layout (no header row):
 *   Section A (station list):    [Station Id, Name, City, Date, Mode]
 *   Section B (project details): [Station Id, Name, City, Business Domain,
 *                                  Total Project, Tags, Description,
 *                                  Project Domain, Title]
 */

const XLSX = require('../node_modules/xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const companiesPath = path.join(__dirname, '../frontend/src/companies_data.json');
const xlsxPath = path.join(__dirname, 'brand new.xlsx');

const existing = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
const existingNames = new Set(existing.map(c => c.name));

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Split: section A rows look like [id, name, city, "April ... 2026", mode]
// Section B rows have a Business Domain string in column 3 and integer count in 4.
const stationInfo = new Map(); // name -> { id, city, mode }
const projectRows = [];

for (const r of rows) {
  if (!r || !r[1]) continue;
  const id = r[0];
  const name = String(r[1]).trim();
  const city = String(r[2] || '').trim();
  const col3 = String(r[3] || '').trim();
  const col4 = r[4];

  // Section A heuristic: column 3 is a date string containing "2026" and column 4 is "Online"/"Onsite"
  if (/2026/.test(col3) && /^(Online|Onsite)$/i.test(String(col4))) {
    stationInfo.set(name, { id, city, mode: String(col4).trim() });
    continue;
  }

  // Section B heuristic: project detail row
  projectRows.push({
    'Station Id': String(id || ''),
    'Station Name': name,
    'Centre (Location)': city,
    'Business Domain': col3,
    'Total Project': String(col4 || ''),
    'Tags': String(r[5] || ''),
    'Description': String(r[6] || ''),
    'Project Domain': String(r[7] || ''),
    'Title': String(r[8] || ''),
  });
}

console.log(`Stations in file: ${stationInfo.size}`);
console.log(`Project rows in file: ${projectRows.length}`);

const newNames = [...stationInfo.keys()].filter(n => !existingNames.has(n));
console.log(`New stations to import (not already in DB): ${newNames.length}`);
if (newNames.length === 0) { console.log('Nothing to import.'); process.exit(0); }

// Group project rows by station name
const projectsByStation = new Map();
for (const row of projectRows) {
  const name = row['Station Name'];
  if (!projectsByStation.has(name)) projectsByStation.set(name, []);
  projectsByStation.get(name).push(row);
}

function normalizeDomain(raw) {
  if (!raw) return 'General';
  const s = raw.toString().trim();
  if (/\bcsis\b|cs\/it|\bcomputer science\b|\binformation tech/i.test(s)) return 'CSIS';
  if (/\bee\b|\bece\b|\belectrical\b|\belectronics\b/i.test(s)) return 'Electrical & Electronics';
  if (/\bme\b|\bmech\b|\bmechanical\b/i.test(s)) return 'Mechanical';
  if (/\bchem\b|\bchemical\b/i.test(s)) return 'Chemical';
  if (/finance|fin\b|economics|finance and mgmt/i.test(s)) return 'Finance';
  if (/consult/i.test(s)) return 'Consulting';
  if (/pharma|bio|life science/i.test(s)) return 'Biotech';
  if (/civil|env|environ|infrastructure/i.test(s)) return 'Infrastructure';
  if (/health\s*care|medical|healthcare/i.test(s)) return 'Health Care';
  if (/^others?$/i.test(s)) return 'Other';
  return s;
}

const isPlaceholder = s => /^[\d,]+$/.test(s) || /details awaited|yet to|tbd/i.test(s);

let maxId = Math.max(...existing.map(c => c.id || 0));
const newEntries = [];

for (const stationName of newNames) {
  const info = stationInfo.get(stationName);
  const mode = info.mode;
  const city = info.city;
  const projects = projectsByStation.get(stationName) || [];

  if (projects.length === 0) {
    newEntries.push({
      id: ++maxId,
      name: stationName,
      domain: '',
      normalized_domain: 'General',
      city,
      project_details: '',
      subdomains: ['General'],
      station_mode: mode,
      is_newly_added: true,
      raw_row: {
        'Station Id': String(info.id || ''),
        'Station Name': stationName,
        'Centre (Location)': city,
      },
    });
    continue;
  }

  for (const row of projects) {
    const domain = row['Business Domain'].trim();
    const normalized_domain = normalizeDomain(domain);

    const title = row['Title'].trim();
    const desc = row['Description'].trim();
    const parts = [];
    if (title && !isPlaceholder(title) && title !== desc) parts.push(title);
    if (desc && !isPlaceholder(desc)) parts.push(desc);
    const project_details = parts.join('\n').trim();

    const subdomains = [];
    const projDomain = (row['Project Domain'] || '').toString();
    if (projDomain && !/yet to|details awaited|tbd|n\/a/i.test(projDomain)) {
      projDomain.split(/[,;/]/).map(s => s.trim()).filter(Boolean).forEach(s => subdomains.push(s));
    }
    if (subdomains.length === 0) subdomains.push('General');

    newEntries.push({
      id: ++maxId,
      name: stationName,
      domain,
      normalized_domain,
      city: row['Centre (Location)'].trim() || city,
      project_details,
      subdomains,
      station_mode: mode,
      is_newly_added: true,
      raw_row: row,
    });
  }
}

const merged = [...existing, ...newEntries];
fs.writeFileSync(companiesPath, JSON.stringify(merged, null, 2));
console.log(`Added ${newEntries.length} project entries for ${newNames.length} new stations.`);
console.log(`Total entries: ${merged.length}`);

// ── Insert into SQLite DB ────────────────────────────────────────────────
const dbPath = path.join(__dirname, '../data/ps1_explorer.db');
if (fs.existsSync(dbPath)) {
  // Build a single SQL script and pipe it via stdin to avoid shell-escape pitfalls.
  const esc = s => String(s ?? '').replace(/'/g, "''");
  const stmts = newEntries.map(entry => {
    const v = [
      entry.name,
      entry.domain,
      entry.normalized_domain,
      entry.city,
      entry.project_details,
      JSON.stringify(entry.subdomains),
      JSON.stringify(entry.raw_row),
    ].map(s => `'${esc(s)}'`).join(', ');
    return `INSERT OR IGNORE INTO companies (name, domain, normalized_domain, city, project_details, subdomains, raw_row) VALUES (${v});`;
  });
  const sql = stmts.join('\n');
  const tmpPath = path.join(__dirname, `.tmp_import_${Date.now()}.sql`);
  fs.writeFileSync(tmpPath, sql);
  try {
    execSync(`sqlite3 "${dbPath}" < "${tmpPath}"`, { stdio: 'pipe', shell: '/bin/bash' });
    console.log('SQLite DB updated.');
  } catch (e) {
    console.log('SQLite update failed:', e.message);
  } finally {
    fs.unlinkSync(tmpPath);
  }
} else {
  console.log('SQLite DB not found at', dbPath, '— skipping DB insert.');
}

// ── Summary ──────────────────────────────────────────────────────────────
const onlineCount = newNames.filter(n => stationInfo.get(n).mode === 'Online').length;
const onsiteCount = newNames.filter(n => stationInfo.get(n).mode === 'Onsite').length;
console.log(`\nSummary: ${onlineCount} Online, ${onsiteCount} Onsite`);
newNames.forEach(n => console.log(` + [${stationInfo.get(n).mode}] ${n} (${stationInfo.get(n).city})`));
