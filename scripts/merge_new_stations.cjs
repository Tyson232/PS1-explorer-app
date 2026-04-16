#!/usr/bin/env node
const XLSX = require('../node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, '../frontend/src/companies_data.json');
const existing = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

const wb = XLSX.readFile(path.join(__dirname, '../List of stations with project title and description - April 16th, 2026.xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' });

const existingIds = new Set(existing.map(c => String(c.raw_row?.['Station Id'] || c.raw_row?.['Station ID'] || '')));
const existingNames = new Set(existing.map(c => c.name));

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

// Deduplicate new rows by Station Id (keep first occurrence per id)
const seenIds = new Set();
const newRows = rows.filter(r => {
  const id = String(r['Station Id']);
  const name = r['Station Name']?.trim();
  if (existingIds.has(id) || existingNames.has(name)) return false;
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  return true;
});

let maxId = Math.max(...existing.map(c => c.id || 0));

const newCompanies = newRows.map(row => {
  const name = row['Station Name']?.trim() || '';
  const domain = row['Business Domain']?.trim() || '';
  const city = row['Centre (Location)']?.trim() || '';
  const normalized_domain = normalizeDomain(domain);

  const title = row['Title']?.trim() || '';
  const desc = row['Description']?.trim() || '';
  const isPlaceholder = s => /^[\d,]+$/.test(s) || /details awaited|yet to|tbd/i.test(s);
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

  return {
    id: ++maxId,
    name,
    domain,
    normalized_domain,
    city,
    project_details,
    subdomains,
    raw_row: row
  };
});

const merged = [...existing, ...newCompanies];
fs.writeFileSync(companiesPath, JSON.stringify(merged, null, 2));
console.log(`Added ${newCompanies.length} new companies. Total: ${merged.length}`);
newCompanies.forEach(c => console.log(' +', c.name, '|', c.city));
