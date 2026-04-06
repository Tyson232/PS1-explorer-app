import { getCompanies, getLastUpdated } from '../_data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  res.json({
    lastUpdated: getLastUpdated(),
    companyCount: String(getCompanies().length),
    watchFilePath: null
  });
}
