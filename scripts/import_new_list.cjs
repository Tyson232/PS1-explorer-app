#!/usr/bin/env node
/**
 * Imports the 90 new stations from "new list.xlsx" into companies_data.json.
 * Uses "List of project titles and description - April 24th, 2026.xlsx" for project details.
 * Marks new entries with is_newly_added: true and station_mode from the Excel.
 * Also inserts into SQLite DB.
 */

const XLSX = require('../node_modules/xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const companiesPath = path.join(__dirname, '../frontend/src/companies_data.json');
const existing = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
const existingNames = new Set(existing.map(c => c.name));

// ── Read new list (mode source) ───────────────────────────────────────────
// Row 0 = col labels, Row 1 = actual header, data from Row 2
const wbNew = XLSX.readFile(path.join(__dirname, '../new list.xlsx'));
const wsNew = wbNew.Sheets[wbNew.SheetNames[0]];
const rawNew = XLSX.utils.sheet_to_json(wsNew, { header: 1, defval: '' });

// Build map: station_name → mode
const modeMap = new Map();
for (let i = 2; i < rawNew.length; i++) {
  const name = rawNew[i][3]?.trim();
  const mode = rawNew[i][6]?.trim() || null;
  if (name) modeMap.set(name, mode);
}

// New station names (not in current companies_data.json)
const newNames = [...modeMap.keys()].filter(n => !existingNames.has(n));
console.log(`New stations to import: ${newNames.length}`);

if (newNames.length === 0) {
  console.log('Nothing to import.');
  process.exit(0);
}

// ── Read April 24th project descriptions ─────────────────────────────────
const wb24 = XLSX.readFile(path.join(__dirname, '../List of project titles and description - April 24th, 2026.xlsx'));
const ws24 = wb24.Sheets[wb24.SheetNames[0]];
const rows24 = XLSX.utils.sheet_to_json(ws24, { raw: false, defval: '' });
// rows24 header: Station Id, Station Name, Centre (Location), Business Domain, Total Project, Tags, Description, Project Domain, Title

// Group April 24th rows by station name
const projectsByStation = new Map();
for (const row of rows24) {
  const name = row['Station Name']?.trim();
  if (!name) continue;
  if (!projectsByStation.has(name)) projectsByStation.set(name, []);
  projectsByStation.get(name).push(row);
}

// ── Domain normalizer ─────────────────────────────────────────────────────
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
  const mode = modeMap.get(stationName);
  const projectRows = projectsByStation.get(stationName);

  if (!projectRows || projectRows.length === 0) {
    // No project data in April 24th file — create minimal entry
    newEntries.push({
      id: ++maxId,
      name: stationName,
      domain: '',
      normalized_domain: 'General',
      city: '',
      project_details: '',
      subdomains: ['General'],
      station_mode: mode,
      is_newly_added: true,
      raw_row: {},
    });
    continue;
  }

  for (const row of projectRows) {
    const domain = row['Business Domain']?.trim() || '';
    const city = row['Centre (Location)']?.trim() || '';
    const normalized_domain = normalizeDomain(domain);

    const title = row['Title']?.trim() || '';
    const desc = row['Description']?.trim() || '';
    const parts = [];
    if (title && !isPlaceholder(title) && title !== desc) parts.push(title);
    if (desc && !isPlaceholder(desc)) parts.push(desc);
    const project_details = parts.join('\n').trim();

    const subdomains = [];
    const projDomain = row['Project Domain']?.toString() || '';
    if (projDomain && !/yet to|details awaited|tbd|n\/a/i.test(projDomain)) {
      projDomain.split(/[,;/]/).map(s => s.trim()).filter(Boolean).forEach(s => subdomains.push(s));
    }
    if (subdomains.length === 0) subdomains.push('General');

    newEntries.push({
      id: ++maxId,
      name: stationName,
      domain,
      normalized_domain,
      city,
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

// ── Also insert into SQLite DB ────────────────────────────────────────────
const dbPath = path.join(__dirname, '../data/ps1_explorer.db');
for (const entry of newEntries) {
  const name = entry.name.replace(/'/g, "''");
  const domain = entry.domain.replace(/'/g, "''");
  const nd = entry.normalized_domain.replace(/'/g, "''");
  const city = entry.city.replace(/'/g, "''");
  const pd = entry.project_details.replace(/'/g, "''");
  const raw = JSON.stringify(entry.raw_row).replace(/'/g, "''");
  try {
    execSync(`sqlite3 "${dbPath}" "INSERT OR IGNORE INTO companies (name, domain, normalized_domain, city, project_details, subdomains, raw_row) VALUES ('${name}', '${domain}', '${nd}', '${city}', '${pd}', '${JSON.stringify(entry.subdomains)}', '${raw}');"`);
  } catch (e) {
    // skip duplicates silently
  }
}
console.log('SQLite DB updated.');

// ── Print new stations summary ────────────────────────────────────────────
const uniqueNew = [...new Set(newEntries.map(e => e.name))];
const onlineCount = uniqueNew.filter(n => modeMap.get(n) === 'Online').length;
const onsiteCount = uniqueNew.filter(n => modeMap.get(n) === 'Onsite').length;
console.log(`\nSummary: ${onlineCount} Online, ${onsiteCount} Onsite`);
uniqueNew.forEach(n => console.log(` + [${modeMap.get(n) || '?'}] ${n}`));
