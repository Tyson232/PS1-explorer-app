import { Router } from 'express';
import {
  getAllCompanies,
  searchCompanies,
  getDomains,
  getSubdomainsByDomain,
  getMeta,
  getEnrichment,
  getDb
} from '../db.js';
import { enrichCompany, queueEnrichment } from '../enricher.js';

const router = Router();

// GET /api/companies
router.get('/', (req, res) => {
  try {
    const { q, domains, subdomains } = req.query;
    const domainList = domains ? domains.split(',').filter(Boolean) : [];
    const subdomainList = subdomains ? subdomains.split(',').filter(Boolean) : [];

    let companies = q || domainList.length > 0
      ? searchCompanies(q || '', domainList, subdomainList)
      : getAllCompanies();

    // Filter by subdomains client-side (SQLite JSON search is limited)
    if (subdomainList.length > 0) {
      companies = companies.filter(c =>
        subdomainList.some(sd => c.subdomains.includes(sd))
      );
    }

    res.json({ companies, total: companies.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/domains
router.get('/domains', (req, res) => {
  try {
    const domains = getDomains();
    const subdomainMap = getSubdomainsByDomain();
    res.json({ domains, subdomainMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/meta
router.get('/meta', (req, res) => {
  try {
    const lastUpdated = getMeta('last_updated');
    const companyCount = getMeta('company_count');
    const watchFilePath = getMeta('watch_file_path');
    res.json({ lastUpdated, companyCount, watchFilePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/:name/enrich
// Fetch (or return cached) enrichment for a company
router.get('/:name/enrich', async (req, res) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);

    // Check cache first
    const cached = getEnrichment(decodedName);
    if (cached && cached.fetch_status === 'done') {
      return res.json({ enrichment: cached, cached: true });
    }

    // Look up domain + project details from DB to give Claude context
    const row = getDb().prepare(
      'SELECT normalized_domain, project_details FROM companies WHERE name = ? LIMIT 1'
    ).get(decodedName);

    const enrichment = await enrichCompany(
      decodedName,
      row?.normalized_domain || '',
      row?.project_details || ''
    );
    res.json({ enrichment, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/companies/:name/enrich/queue
// Queue a background enrichment
router.post('/:name/enrich/queue', (req, res) => {
  try {
    const decodedName = decodeURIComponent(req.params.name);
    const row = getDb().prepare(
      'SELECT normalized_domain, project_details FROM companies WHERE name = ? LIMIT 1'
    ).get(decodedName);
    queueEnrichment(decodedName, row?.normalized_domain, row?.project_details);
    res.json({ queued: true, name: decodedName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
