import XLSX from 'xlsx';
import { classifySubdomains, normalizeDomain } from './classifier.js';
import { upsertCompanies, setMeta } from './db.js';

// Column name aliases — ordered most-specific first to avoid false matches
// e.g. "Total Project" must NOT match before "Description"
const COL_ALIASES = {
  name: ['station name', 'company name', 'company', 'organization', 'org', 'firm', 'name'],
  domain: ['business domain', 'domain', 'field', 'branch', 'discipline', 'department'],
  city: ['location (centre)', 'location', 'city', 'place', 'hq', 'headquarters'],
  // "description" must come before "project" so "Total Project" doesn't win over "Description"
  project_details: ['project details', 'description', 'work', 'profile', 'jd', 'job description', 'role'],
  // New: pre-classified subdomain / skill tags from the sheet
  project_domain: ['project domain', 'skill', 'skills', 'sub domain', 'subdomain', 'specialization'],
  title: ['title']
};

function findColumn(headers, fieldKey) {
  const aliases = COL_ALIASES[fieldKey];
  // Try exact (case-insensitive) match first, then substring
  for (const alias of aliases) {
    const exact = headers.find(h => h.toLowerCase().trim() === alias);
    if (exact) return exact;
  }
  for (const alias of aliases) {
    const sub = headers.find(h => h.toLowerCase().trim().includes(alias));
    if (sub) return sub;
  }
  return null;
}

function buildSubdomains(row, normalizedDomain, projectDetails, projectDomainCol, titleCol) {
  const subdomainsFromSheet = [];

  // 1. Use the pre-classified "Project Domain" column if present
  if (projectDomainCol && row[projectDomainCol]) {
    const raw = row[projectDomainCol].toString();
    // Skip placeholder values
    if (!/yet to|details awaited|tbd|n\/a/i.test(raw)) {
      raw.split(/[,;/]/).map(s => s.trim()).filter(Boolean).forEach(s => {
        subdomainsFromSheet.push(s);
      });
    }
  }

  // 2. Also run keyword classifier on the description + title for anything missed
  const titleText = (titleCol && row[titleCol]) ? row[titleCol].toString() : '';
  const combinedText = [projectDetails, titleText].filter(Boolean).join(' ');
  const classified = classifySubdomains(normalizedDomain, combinedText);

  // Merge, deduplicate (case-insensitive), prefer sheet values
  const seen = new Set(subdomainsFromSheet.map(s => s.toLowerCase()));
  for (const s of classified) {
    if (s !== 'General' && !seen.has(s.toLowerCase())) {
      subdomainsFromSheet.push(s);
      seen.add(s.toLowerCase());
    }
  }

  return subdomainsFromSheet.length > 0 ? subdomainsFromSheet : ['General'];
}

function buildProjectDetails(row, projectCol, titleCol) {
  const desc = (projectCol && row[projectCol]) ? row[projectCol].toString().trim() : '';
  const title = (titleCol && row[titleCol]) ? row[titleCol].toString().trim() : '';

  // Skip meaningless placeholders
  const isPlaceholder = (s) => /^[\d,]+$/.test(s) || /details awaited|yet to|tbd/i.test(s);

  const parts = [];
  if (title && !isPlaceholder(title) && title !== desc) parts.push(title);
  if (desc && !isPlaceholder(desc)) parts.push(desc);

  return parts.join('\n').trim();
}

function processRows(rows) {
  if (rows.length === 0) throw new Error('File is empty or has no data rows');

  const headers = Object.keys(rows[0]);
  const nameCol       = findColumn(headers, 'name');
  const domainCol     = findColumn(headers, 'domain');
  const cityCol       = findColumn(headers, 'city');
  const projectCol    = findColumn(headers, 'project_details');
  const projDomainCol = findColumn(headers, 'project_domain');
  const titleCol      = findColumn(headers, 'title');

  if (!nameCol) {
    throw new Error(`Could not find company name column. Headers: ${headers.join(', ')}`);
  }

  console.log(`[Parser] Columns → name:${nameCol} domain:${domainCol} city:${cityCol} desc:${projectCol} projDomain:${projDomainCol} title:${titleCol}`);

  return rows
    .filter(row => row[nameCol]?.toString().trim())
    .map(row => {
      const rawName   = row[nameCol].toString().trim();
      const rawDomain = (domainCol ? row[domainCol] : '')?.toString().trim() || '';
      const rawCity   = (cityCol   ? row[cityCol]   : '')?.toString().trim() || '';

      const normalizedDomain = normalizeDomain(rawDomain);
      const projectDetails   = buildProjectDetails(row, projectCol, titleCol);
      const subdomains       = buildSubdomains(row, normalizedDomain, projectDetails, projDomainCol, titleCol);

      return {
        name: rawName,
        domain: rawDomain,
        normalized_domain: normalizedDomain,
        city: rawCity,
        project_details: projectDetails,
        subdomains: JSON.stringify(subdomains),
        raw_row: JSON.stringify(row)
      };
    });
}

export function parseFile(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  const companies = processRows(rows);
  upsertCompanies(companies);
  setMeta('last_updated', new Date().toISOString());
  setMeta('company_count', companies.length.toString());

  console.log(`[Parser] Loaded ${companies.length} companies from ${filePath}`);
  return companies.length;
}

export function parseCsv(csvText) {
  const workbook = XLSX.read(csvText, { type: 'string', raw: false, defval: '' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  const companies = processRows(rows);
  upsertCompanies(companies);
  setMeta('last_updated', new Date().toISOString());
  setMeta('company_count', companies.length.toString());

  console.log(`[Parser] Loaded ${companies.length} companies from CSV`);
  return companies.length;
}
