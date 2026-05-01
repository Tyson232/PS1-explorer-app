#!/usr/bin/env node
/**
 * Cross-checks "Station with workmode.xlsx" against companies_data.json +
 * ps_data.json and brings them in sync:
 *   - Adds/updates work_mode in ps_data.json for every station in the official
 *     list (matched by Station Id, falling back to name).
 *   - Inserts station_mode into companies_data.json for any entry missing it.
 *   - Adds missing stations as minimal entries in companies_data.json
 *     (and SQLite) with the official mode.
 */

const XLSX = require('../node_modules/xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const xlsxPath     = path.join(ROOT, 'Station with workmode.xlsx');
const companiesPath = path.join(ROOT, 'frontend/src/companies_data.json');
const psDataPath    = path.join(ROOT, 'frontend/src/ps_data.json');
const dbPath        = path.join(ROOT, 'data/ps1_explorer.db');

const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
const psData    = JSON.parse(fs.readFileSync(psDataPath, 'utf8'));

const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
const officialRows = rows.slice(1).filter(r => r[1]);

// Index companies_data.json by station id and by name
const byId = new Map();
const byName = new Map();
for (const c of companies) {
  const sid = c.raw_row && (c.raw_row['Station Id'] || c.raw_row['Station ID']);
  if (sid) {
    if (!byId.has(String(sid))) byId.set(String(sid), c);
  }
  if (!byName.has(c.name)) byName.set(c.name, c);
}

let psUpdated = 0, psAdded = 0, modeFilled = 0;
const newStations = [];
let maxId = Math.max(...companies.map(c => c.id || 0));

for (const r of officialRows) {
  const [sid, name, city, date, mode] = r;
  const sidStr = String(sid);

  // Resolve to a company entry (prefer id match)
  let company = byId.get(sidStr);
  if (!company && byName.has(name)) company = byName.get(name);

  if (company) {
    // Use the existing canonical name (don't introduce duplicate keys)
    const canonical = company.name;
    if (!psData[canonical]) {
      psData[canonical] = { min_cg: null, contact_emails: [], work_mode: mode };
      psAdded++;
    } else if (psData[canonical].work_mode !== mode) {
      psData[canonical].work_mode = mode;
      psUpdated++;
    }

    // Also fill station_mode on every project row of this station
    for (const c of companies) {
      if (c.name === canonical && c.station_mode !== mode) {
        c.station_mode = mode;
        modeFilled++;
      }
    }
    continue;
  }

  // Brand-new station — minimal entry
  const entry = {
    id: ++maxId,
    name,
    domain: '',
    normalized_domain: 'General',
    city,
    project_details: '',
    subdomains: ['General'],
    station_mode: mode,
    raw_row: {
      'Station Id': sidStr,
      'Station Name': name,
      'Centre (Location)': city,
    },
  };
  companies.push(entry);
  byId.set(sidStr, entry);
  byName.set(name, entry);
  newStations.push(entry);
  psData[name] = { min_cg: null, contact_emails: [], work_mode: mode };
  psAdded++;
}

fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2));
fs.writeFileSync(psDataPath, JSON.stringify(psData, null, 2));

console.log(`ps_data.json — updated: ${psUpdated}, added: ${psAdded}`);
console.log(`companies_data.json — station_mode filled: ${modeFilled}, new minimal entries: ${newStations.length}`);

// ── SQLite sync for new minimal entries ─────────────────────────────────
if (fs.existsSync(dbPath) && newStations.length > 0) {
  const esc = s => String(s ?? '').replace(/'/g, "''");
  const stmts = newStations.map(e => {
    const v = [
      e.name,
      e.domain,
      e.normalized_domain,
      e.city,
      e.project_details,
      JSON.stringify(e.subdomains),
      JSON.stringify(e.raw_row),
    ].map(s => `'${esc(s)}'`).join(', ');
    return `INSERT OR IGNORE INTO companies (name, domain, normalized_domain, city, project_details, subdomains, raw_row) VALUES (${v});`;
  });
  const tmp = path.join(__dirname, `.tmp_sync_${Date.now()}.sql`);
  fs.writeFileSync(tmp, stmts.join('\n'));
  try {
    execSync(`sqlite3 "${dbPath}" < "${tmp}"`, { stdio: 'pipe', shell: '/bin/bash' });
    console.log('SQLite synced.');
  } finally {
    fs.unlinkSync(tmp);
  }
}

// ── Final verification ─────────────────────────────────────────────────
const onlineCount = Object.values(psData).filter(v => v.work_mode === 'Online').length;
const onsiteCount = Object.values(psData).filter(v => v.work_mode === 'Onsite').length;
console.log(`\nFinal ps_data.json: ${onlineCount} Online, ${onsiteCount} Onsite, ${Object.keys(psData).length} total`);

const officialOnline = officialRows.filter(r => r[4] === 'Online').length;
const officialOnsite = officialRows.filter(r => r[4] === 'Onsite').length;
console.log(`Official xlsx:      ${officialOnline} Online, ${officialOnsite} Onsite`);
