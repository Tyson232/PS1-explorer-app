import { getCompanies } from '../_data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const companies = getCompanies();

  // Count by domain
  const domainCounts = {};
  const subdomainMap = {};

  for (const c of companies) {
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

  res.json({ domains, subdomainMap: subdomainMapArr });
}
