import { getCompanies } from '../_data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { q, domains, subdomains } = req.query;
  const domainList = domains ? domains.split(',').filter(Boolean) : [];
  const subdomainList = subdomains ? subdomains.split(',').filter(Boolean) : [];

  let companies = getCompanies();

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

  res.json({ companies, total: companies.length });
}
