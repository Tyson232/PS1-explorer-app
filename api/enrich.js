import { GoogleGenerativeAI } from '@google/generative-ai';

const SCALE_BADGE_MAP = {
  early_startup: '🌱 Early Startup',
  growth_stage: '🚀 Growth Stage',
  mid_size: '🏢 Mid-size',
  enterprise: '🌐 Enterprise'
};

// Simple in-memory cache per lambda instance
const cache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });

  const companyName = decodeURIComponent(name);

  if (cache.has(companyName)) {
    return res.json({ enrichment: cache.get(companyName), cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.json({ enrichment: { fetch_status: 'skipped' }, cached: false });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(
      `Research the company "${companyName}" and return ONLY a JSON object with these fields (null if unknown):
{"description":"2-3 sentences about what they do","founding_year":"YYYY","hq":"City, Country","website":"domain.com","employee_count":"e.g. 10000+","scale":"early_startup|growth_stage|mid_size|enterprise","funding_stage":"e.g. Series B","investors":["A","B"],"tech_stack":["X","Y"],"culture_snippet":"one sentence about their culture"}
Scale: early_startup<50 employees, growth_stage 50-500, mid_size 500-5000, enterprise 5000+ or public.`
    );

    const text = result.response.text().replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');

    const data = JSON.parse(match[0]);
    const enrichment = {
      scale_badge: SCALE_BADGE_MAP[data.scale] || null,
      employee_count: data.employee_count || null,
      description: data.description || null,
      founding_year: data.founding_year ? String(data.founding_year) : null,
      hq: data.hq || null,
      website: data.website || null,
      funding_stage: data.funding_stage || null,
      investors: Array.isArray(data.investors) ? data.investors.slice(0,5) : [],
      tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack.slice(0,8) : [],
      culture_snippet: data.culture_snippet || null,
      fetch_status: 'done'
    };

    cache.set(companyName, enrichment);
    res.json({ enrichment, cached: false });
  } catch (err) {
    res.json({ enrichment: { fetch_status: 'error' }, cached: false });
  }
}
