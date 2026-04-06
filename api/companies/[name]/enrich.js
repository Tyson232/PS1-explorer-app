import { GoogleGenerativeAI } from '@google/generative-ai';
import { enrichmentCache, getCompanies } from '../_data.js';

const SCALE_BADGE_MAP = {
  early_startup: '🌱 Early Startup',
  growth_stage: '🚀 Growth Stage',
  mid_size: '🏢 Mid-size',
  enterprise: '🌐 Enterprise'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });

  const companyName = decodeURIComponent(name);

  // Check in-memory cache
  if (enrichmentCache.has(companyName)) {
    return res.json({ enrichment: enrichmentCache.get(companyName), cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ enrichment: { fetch_status: 'skipped' }, cached: false });
  }

  // Find company context
  const company = getCompanies().find(c => c.name === companyName);
  const domain = company?.normalized_domain || '';
  const projectDetails = company?.project_details || '';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a company research assistant with broad knowledge of companies worldwide, including Indian tech companies and startups.

Research this company and return a JSON object with everything you know about it.

Company: ${companyName}
Domain / Field: ${domain || 'not specified'}
Project context: ${projectDetails?.slice(0, 300) || 'not provided'}

Return ONLY a valid JSON object — no markdown, no explanation — with these exact fields (use null for anything you're not confident about):

{
  "description": "2-3 sentence description of what the company does",
  "founding_year": "YYYY",
  "hq": "City, Country",
  "website": "example.com",
  "employee_count": "e.g. '10,000+' or '200-500'",
  "scale": "early_startup or growth_stage or mid_size or enterprise",
  "funding_stage": "e.g. Series B or IPO / Public or Bootstrapped or Seed",
  "investors": ["Investor A", "Investor B"],
  "tech_stack": ["Python", "React", "AWS"],
  "culture_snippet": "One sentence about their engineering culture or work environment"
}

Scale: early_startup (<50 employees), growth_stage (50-500), mid_size (500-5000), enterprise (5000+ or public MNC)`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const data = JSON.parse(jsonMatch[0]);
    const enrichment = {
      scale_badge: SCALE_BADGE_MAP[data.scale] || null,
      employee_count: data.employee_count || null,
      description: data.description || null,
      founding_year: data.founding_year ? String(data.founding_year) : null,
      hq: data.hq || null,
      website: data.website || null,
      funding_stage: data.funding_stage || null,
      investors: Array.isArray(data.investors) ? data.investors.slice(0, 5) : [],
      tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack.slice(0, 8) : [],
      culture_snippet: data.culture_snippet || null,
      fetch_status: 'done'
    };

    enrichmentCache.set(companyName, enrichment);
    res.json({ enrichment, cached: false });
  } catch (err) {
    res.json({ enrichment: { fetch_status: 'error', error: err.message }, cached: false });
  }
}
