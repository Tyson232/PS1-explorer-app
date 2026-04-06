import { getCompanies } from './_data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ok: true, companies: getCompanies().length, timestamp: new Date().toISOString() });
}
