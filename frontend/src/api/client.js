import companiesData from '../companies_data.json';
import psData from '../ps_data.json';

// Merge PS response data (min CG, emails, work mode) into every company
const _companiesWithPS = companiesData.map(c => {
  const ps = psData[c.name];
  return ps
    ? { ...c, min_cg: ps.min_cg, contact_emails: ps.contact_emails, work_mode: ps.work_mode }
    : { ...c, min_cg: null, contact_emails: [], work_mode: null };
});

// ─── In-memory store ──────────────────────────────────────────────────────
let _companies = _companiesWithPS;
let _lastUpdated = new Date().toISOString();

// ─── Companies ────────────────────────────────────────────────────────────

export function fetchCompanies(params = {}) {
  const { q, domains, subdomains, cities, workModes } = params;
  const domainList = domains ? domains.split(',').filter(Boolean) : [];
  const subdomainList = subdomains ? subdomains.split(',').filter(Boolean) : [];
  const cityList = cities ? cities.split(',').filter(Boolean) : [];
  const workModeList = workModes ? workModes.split(',').filter(Boolean) : [];

  let companies = _companies;

  if (q) {
    const ql = q.toLowerCase();
    companies = companies.filter(c =>
      c.name?.toLowerCase().includes(ql) ||
      c.domain?.toLowerCase().includes(ql) ||
      c.city?.toLowerCase().includes(ql) ||
      c.project_details?.toLowerCase().includes(ql)
    );
  }

  if (domainList.length > 0) {
    companies = companies.filter(c => domainList.includes(c.normalized_domain));
  }

  if (subdomainList.length > 0) {
    companies = companies.filter(c =>
      subdomainList.some(sd => c.subdomains?.includes(sd))
    );
  }

  if (cityList.length > 0) {
    companies = companies.filter(c => cityList.includes(c.city?.trim()));
  }

  if (workModeList.length > 0) {
    companies = companies.filter(c => c.work_mode && workModeList.includes(c.work_mode));
  }

  return Promise.resolve({ companies, total: companies.length });
}

export function fetchCities() {
  const citySet = new Set();
  for (const c of _companies) {
    if (c.city?.trim()) citySet.add(c.city.trim());
  }
  const cities = [...citySet].sort();
  return Promise.resolve({ cities });
}

export function fetchDomains() {
  const domainCounts = {};
  const subdomainMap = {};

  for (const c of _companies) {
    const d = c.normalized_domain || 'General';
    domainCounts[d] = (domainCounts[d] || 0) + 1;
    if (!subdomainMap[d]) subdomainMap[d] = new Set();
    (c.subdomains || []).forEach(s => subdomainMap[d].add(s));
  }

  const domains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  const subdomainMapArr = {};
  for (const [k, v] of Object.entries(subdomainMap)) {
    subdomainMapArr[k] = [...v].sort();
  }

  return Promise.resolve({ domains, subdomainMap: subdomainMapArr });
}

export function fetchMeta() {
  return Promise.resolve({
    lastUpdated: _lastUpdated,
    companyCount: String(_companies.length),
    watchFilePath: null
  });
}

// ─── Enrichment cache (memory + localStorage persistence) ────────────────

const ENRICH_STORAGE_KEY = 'ps1_enrichment_cache';

// Seed in-memory cache from localStorage on module load
const enrichmentCache = (() => {
  try {
    const stored = localStorage.getItem(ENRICH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
})();

function persistCache() {
  try {
    localStorage.setItem(ENRICH_STORAGE_KEY, JSON.stringify(enrichmentCache));
  } catch {
    // localStorage full or unavailable — fine, memory cache still works
  }
}

// Expose the cache so App can seed React state from it without extra fetches
export function getEnrichmentCache() { return enrichmentCache; }

export async function fetchEnrichment(companyName) {
  if (enrichmentCache[companyName]) {
    return { enrichment: enrichmentCache[companyName], cached: true };
  }
  try {
    const res = await fetch(`/api/enrich?name=${encodeURIComponent(companyName)}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    // Only cache successful enrichments, not errors/skipped
    if (data.enrichment?.fetch_status === 'done') {
      enrichmentCache[companyName] = data.enrichment;
      persistCache();
    }
    return data;
  } catch {
    return { enrichment: { fetch_status: 'error' }, cached: false };
  }
}

export function queueEnrichment() { return Promise.resolve(); }

// ─── Upload (replaces in-memory store) ───────────────────────────────────

export async function uploadFile(file, onProgress) {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', raw: false, defval: '' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
        if (rows.length === 0) throw new Error('File has no data rows');

        const companies = parseRows(rows);
        _companies = companies;
        _lastUpdated = new Date().toISOString();
        if (onProgress) onProgress(100);
        resolve({ success: true, count: companies.length, message: `Loaded ${companies.length} companies` });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function refreshData() {
  return Promise.reject(new Error('No watched file on Vercel. Please upload a file.'));
}

// ─── Parser helpers ───────────────────────────────────────────────────────

const COL_ALIASES = {
  name: ['station name', 'company name', 'company', 'organization', 'name'],
  domain: ['business domain', 'domain', 'field', 'branch'],
  city: ['location (centre)', 'location', 'city', 'place', 'hq'],
  project_details: ['project details', 'description', 'work', 'profile'],
  project_domain: ['project domain', 'skill', 'subdomain', 'specialization'],
  title: ['title']
};

function findCol(headers, key) {
  for (const alias of COL_ALIASES[key]) {
    const exact = headers.find(h => h.toLowerCase().trim() === alias);
    if (exact) return exact;
  }
  for (const alias of COL_ALIASES[key]) {
    const sub = headers.find(h => h.toLowerCase().trim().includes(alias));
    if (sub) return sub;
  }
  return null;
}

function normalizeDomain(raw) {
  if (!raw) return 'General';
  const s = raw.toString().trim();
  if (/csis|cs\/it|cs|it\b|computer science|information tech/i.test(s)) return 'CSIS';
  if (/ee|ece|electrical|electronics/i.test(s)) return 'Electrical & Electronics';
  if (/me\b|mech|mechanical/i.test(s)) return 'Mechanical';
  if (/chem|chemical/i.test(s)) return 'Chemical';
  if (/finance|fin\b|economics|finance and mgmt/i.test(s)) return 'Finance';
  if (/consult/i.test(s)) return 'Consulting';
  if (/pharma|bio|life science/i.test(s)) return 'Biotech';
  if (/civil|env|environ|infrastructure/i.test(s)) return 'Infrastructure';
  if (/others/i.test(s)) return 'Others';
  return s;
}

function parseRows(rows) {
  const headers = Object.keys(rows[0]);
  const nameCol = findCol(headers, 'name');
  const domainCol = findCol(headers, 'domain');
  const cityCol = findCol(headers, 'city');
  const projectCol = findCol(headers, 'project_details');
  const projDomainCol = findCol(headers, 'project_domain');
  const titleCol = findCol(headers, 'title');

  if (!nameCol) throw new Error(`Cannot find company name column. Headers: ${headers.join(', ')}`);

  let id = 1;
  return rows.filter(row => row[nameCol]?.toString().trim()).map(row => {
    const name = row[nameCol].toString().trim();
    const domain = (domainCol ? row[domainCol] : '')?.toString().trim() || '';
    const city = (cityCol ? row[cityCol] : '')?.toString().trim() || '';

    const title = (titleCol && row[titleCol]) ? row[titleCol].toString().trim() : '';
    const desc = (projectCol && row[projectCol]) ? row[projectCol].toString().trim() : '';
    const isPlaceholder = s => /^[\d,]+$/.test(s) || /details awaited|yet to|tbd/i.test(s);
    const parts = [];
    if (title && !isPlaceholder(title) && title !== desc) parts.push(title);
    if (desc && !isPlaceholder(desc)) parts.push(desc);
    const project_details = parts.join('\n').trim();

    const normalized_domain = normalizeDomain(domain);

    const subdomains = [];
    if (projDomainCol && row[projDomainCol]) {
      const raw = row[projDomainCol].toString();
      if (!/yet to|details awaited|tbd|n\/a/i.test(raw)) {
        raw.split(/[,;/]/).map(s => s.trim()).filter(Boolean).forEach(s => subdomains.push(s));
      }
    }
    if (subdomains.length === 0) subdomains.push('General');

    return { id: id++, name, domain, normalized_domain, city, project_details, subdomains, raw_row: row };
  });
}
