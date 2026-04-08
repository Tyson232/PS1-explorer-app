#!/usr/bin/env node
/**
 * Reads PS Station Responses.xlsx and generates frontend/src/ps_data.json
 * Run with: node scripts/generate_ps_data.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ── Load data ──────────────────────────────────────────────────────────────
const responsesPath = path.join(__dirname, '..', 'PS Station Responses.xlsx');
const companiesPath = path.join(__dirname, '..', 'frontend', 'src', 'companies_data.json');
const outPath = path.join(__dirname, '..', 'frontend', 'src', 'ps_data.json');

const wb = XLSX.readFile(responsesPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

// ── Group responses by station ────────────────────────────────────────────
const stationMap = {};
rows.forEach(r => {
  const station = r['Your allotted station']?.trim();
  if (!station) return;
  if (!stationMap[station]) stationMap[station] = { cgpas: [], emails: [], modes: new Set() };

  const raw = r['CGPA (need for cutoffs, pls be honest)']?.trim();
  const cg = parseFloat(raw);
  if (!isNaN(cg) && cg > 0 && cg <= 10) stationMap[station].cgpas.push(cg);

  const email = r['Email Address']?.trim();
  if (email && email.includes('@')) stationMap[station].emails.push(email);

  const mode = r['Station Mode']?.trim();
  if (mode && mode.length > 0) stationMap[station].modes.add(mode);
});

// ── Normalize helper ──────────────────────────────────────────────────────
// Strip all punctuation so "Pvt. Ltd." == "Pvt Ltd", hyphens become spaces, etc.
// Normalize: remove ALL punctuation (hyphens too become empty, not spaces).
// This means "Workshop-CS" → "workshopcs", so "workshop" is still a substring.
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Match each company to its stations ───────────────────────────────────
// Rule: the normalized station name must CONTAIN the normalized company name
// (forward direction only — never reverse — to avoid false positives).
const result = {};

companies.forEach(company => {
  const normName = normalize(company.name);
  const allStationKeys = Object.keys(stationMap);

  const matchingStations = allStationKeys.filter(station => {
    const normStation = normalize(station);
    return normStation.includes(normName);
  });

  if (matchingStations.length === 0) return;

  const allCgpas = matchingStations.flatMap(s => stationMap[s].cgpas);
  const allEmails = [...new Set(matchingStations.flatMap(s => stationMap[s].emails))];

  // Determine consensus work mode
  const modeCount = {};
  matchingStations.flatMap(s => [...stationMap[s].modes]).forEach(m => {
    modeCount[m] = (modeCount[m] || 0) + 1;
  });
  const topMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  result[company.name] = {
    min_cg: allCgpas.length > 0
      ? parseFloat(Math.min(...allCgpas).toFixed(2))
      : null,
    contact_emails: allEmails,
    work_mode: topMode,
  };
});

// ── Write output ──────────────────────────────────────────────────────────
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

const matched = Object.keys(result).length;
console.log(`Done! Matched ${matched}/${companies.length} companies.`);
console.log(`Written to ${outPath}`);

// Summary of work modes found
const modes = {};
Object.values(result).forEach(d => {
  const m = d.work_mode || 'Unknown';
  modes[m] = (modes[m] || 0) + 1;
});
console.log('Work mode distribution:', modes);
