#!/usr/bin/env node
/**
 * Applies OC-announced corrections that aren't in the data yet:
 *  - Adds Pixaflip Technologies Pvt Ltd (8835, Pune) as Onsite (changed from Online)
 *  - Updates ps_data.json with work_mode for Pixaflip
 *  - Syncs SQLite db: location fixes for ONGC Ahmedabad (8625) and RRSC (8561)
 *
 * Other corrections (FlairX/Nouveau/VNR Online, Grasim Onsite, ONGC/RRSC location)
 * are already reflected in companies_data.json + ps_data.json, but the SQLite db
 * is behind — this script re-syncs it.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const companiesPath = path.join(ROOT, 'frontend/src/companies_data.json');
const psDataPath    = path.join(ROOT, 'frontend/src/ps_data.json');
const dbPath        = path.join(ROOT, 'data/ps1_explorer.db');

// ─── 1. companies_data.json: add Pixaflip ───────────────────────────────────
const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
const hasPixa = companies.some(c => /Pixaflip/i.test(c.name || ''));
if (!hasPixa) {
  const maxId = Math.max(...companies.map(c => c.id || 0));
  const pixa = {
    id: maxId + 1,
    name: 'Pixaflip Technologies Pvt Ltd',
    domain: 'CSIS/IT',
    normalized_domain: 'CSIS',
    city: 'Pune',
    project_details: [
      'Title: Turtle Conservation',
      'Description: A project focused on protecting turtle nests using image-based analysis, smartsensors, and IoT-based monitoring for early detection and better conservation support.Skill sets: AI/ML, image processing, IoT, sensor data handling, basic data analysisExpected learning: Practical exposure to smart monitoring, image analysis, sensor integration,and real-world conservation problem solving.Specific courses required for project execution:',
      'Title: DGT',
      'Description: Data Gathering ToolSkill sets:Expected learning:Specific courses required for project execution:',
    ].join('\n'),
    subdomains: ['AI & ML', 'Data Analysis'],
    station_mode: 'Onsite',
    raw_row: {
      'Station Id': '8835',
      'Station Name': 'Pixaflip Technologies Pvt Ltd',
      'Centre (Location)': 'Pune',
      'Business Domain': 'CSIS/IT',
      'Total Project': '2',
      'Tags': 'Any,Any',
      'Description': 'Description: A project focused on protecting turtle nests using image-based analysis, smartsensors, and IoT-based monitoring for early detection and better conservation support.Skill sets: AI/ML, image processing, IoT, sensor data handling, basic data analysisExpected learning: Practical exposure to smart monitoring, image analysis, sensor integration,and real-world conservation problem solving.Specific courses required for project execution:,Description: Data Gathering ToolSkill sets:Expected learning:Specific courses required for project execution:',
      'Project Domain': 'AI & ML,Data Analysis',
      'Title': 'Title: Turtle Conservation,Title: DGT',
    },
  };
  companies.push(pixa);
  fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2));
  console.log(`Added Pixaflip Technologies Pvt Ltd (id=${pixa.id}) as Onsite to companies_data.json`);
} else {
  console.log('Pixaflip already present in companies_data.json — skipping insert');
}

// ─── 2. ps_data.json: add Pixaflip work_mode ────────────────────────────────
const psData = JSON.parse(fs.readFileSync(psDataPath, 'utf8'));
if (!psData['Pixaflip Technologies Pvt Ltd']) {
  psData['Pixaflip Technologies Pvt Ltd'] = {
    min_cg: null,
    contact_emails: [],
    work_mode: 'Onsite',
  };
  fs.writeFileSync(psDataPath, JSON.stringify(psData, null, 2));
  console.log('Added Pixaflip Technologies Pvt Ltd (Onsite) to ps_data.json');
} else if (psData['Pixaflip Technologies Pvt Ltd'].work_mode !== 'Onsite') {
  psData['Pixaflip Technologies Pvt Ltd'].work_mode = 'Onsite';
  fs.writeFileSync(psDataPath, JSON.stringify(psData, null, 2));
  console.log('Updated Pixaflip work_mode → Onsite in ps_data.json');
} else {
  console.log('Pixaflip already Onsite in ps_data.json — skipping');
}

// ─── 3. SQLite sync: location fixes + Pixaflip insert ───────────────────────
if (!fs.existsSync(dbPath)) {
  console.log('SQLite db not found, skipping db sync');
  process.exit(0);
}

const esc = s => String(s ?? '').replace(/'/g, "''");
const stmts = [];

// Fix ONGC, Ahmedabad (8625): New Delhi → Ahmedabad
stmts.push(`UPDATE companies SET city = 'Ahmedabad', raw_row = json_set(raw_row, '$."Location (Centre)"', 'Ahmedabad') WHERE json_extract(raw_row, '$."Station Id"') = '8625';`);

// Fix RRSC (8561): Nagapur → Nagpur
stmts.push(`UPDATE companies SET city = 'Nagpur', raw_row = json_set(raw_row, '$."Location (Centre)"', 'Nagpur') WHERE json_extract(raw_row, '$."Station Id"') = '8561';`);

// Insert Pixaflip if missing in SQLite
const pixaRawRow = JSON.stringify({
  'Station Id': '8835',
  'Station Name': 'Pixaflip Technologies Pvt Ltd',
  'Centre (Location)': 'Pune',
  'Business Domain': 'CSIS/IT',
  'Total Project': '2',
  'Tags': 'Any,Any',
  'Description': 'Description: A project focused on protecting turtle nests using image-based analysis, smartsensors, and IoT-based monitoring for early detection and better conservation support.Skill sets: AI/ML, image processing, IoT, sensor data handling, basic data analysisExpected learning: Practical exposure to smart monitoring, image analysis, sensor integration,and real-world conservation problem solving.Specific courses required for project execution:,Description: Data Gathering ToolSkill sets:Expected learning:Specific courses required for project execution:',
  'Project Domain': 'AI & ML,Data Analysis',
  'Title': 'Title: Turtle Conservation,Title: DGT',
});
const pixaProjDetails = [
  'Title: Turtle Conservation',
  'Description: A project focused on protecting turtle nests using image-based analysis, smartsensors, and IoT-based monitoring for early detection and better conservation support.Skill sets: AI/ML, image processing, IoT, sensor data handling, basic data analysisExpected learning: Practical exposure to smart monitoring, image analysis, sensor integration,and real-world conservation problem solving.Specific courses required for project execution:',
  'Title: DGT',
  'Description: Data Gathering ToolSkill sets:Expected learning:Specific courses required for project execution:',
].join('\n');

stmts.push(
  `INSERT OR IGNORE INTO companies (name, domain, normalized_domain, city, project_details, subdomains, raw_row) ` +
  `VALUES ('Pixaflip Technologies Pvt Ltd', 'CSIS/IT', 'CSIS', 'Pune', '${esc(pixaProjDetails)}', '${esc(JSON.stringify(["AI & ML","Data Analysis"]))}', '${esc(pixaRawRow)}');`
);

const tmpPath = path.join(__dirname, `.tmp_oc_${Date.now()}.sql`);
fs.writeFileSync(tmpPath, stmts.join('\n'));
try {
  execSync(`sqlite3 "${dbPath}" < "${tmpPath}"`, { stdio: 'pipe', shell: '/bin/bash' });
  console.log('SQLite db synced (location fixes + Pixaflip insert).');
} catch (e) {
  console.error('SQLite sync failed:', e.message);
  process.exit(1);
} finally {
  fs.unlinkSync(tmpPath);
}
