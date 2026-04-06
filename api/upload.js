import XLSX from 'xlsx';
import { setCompanies } from './_data.js';
import { normalizeDomain } from './_classifier.js';

export const config = { api: { bodyParser: false } };

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

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = await readBody(req);
    const contentType = req.headers['content-type'] || '';

    // Parse multipart to extract file bytes
    const boundary = contentType.match(/boundary=(.+)/)?.[1];
    if (!boundary) return res.status(400).json({ error: 'No boundary in content-type' });

    const parts = body.toString('binary').split(`--${boundary}`);
    let fileBuffer = null;
    let filename = '';

    for (const part of parts) {
      if (part.includes('filename=')) {
        const fnMatch = part.match(/filename="([^"]+)"/);
        if (fnMatch) filename = fnMatch[1];
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const rawData = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
          fileBuffer = Buffer.from(rawData, 'binary');
        }
        break;
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file found in upload' });

    const wb = XLSX.read(fileBuffer, { type: 'buffer', raw: false, defval: '' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'File has no data rows' });

    const headers = Object.keys(rows[0]);
    const nameCol = findCol(headers, 'name');
    if (!nameCol) return res.status(400).json({ error: `Cannot find name column. Headers: ${headers.join(', ')}` });

    const domainCol = findCol(headers, 'domain');
    const cityCol = findCol(headers, 'city');
    const projectCol = findCol(headers, 'project_details');
    const projDomainCol = findCol(headers, 'project_domain');
    const titleCol = findCol(headers, 'title');

    let id = 1;
    const companies = rows
      .filter(row => row[nameCol]?.toString().trim())
      .map(row => {
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

        return {
          id: id++,
          name,
          domain,
          normalized_domain,
          city,
          project_details,
          subdomains,
          raw_row: row
        };
      });

    setCompanies(companies);
    res.json({ success: true, count: companies.length, message: `Loaded ${companies.length} companies` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
