import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnrichment, saveEnrichment } from './db.js';

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const SCALE_BADGE_MAP = {
  early_startup: '🌱 Early Startup',
  growth_stage: '🚀 Growth Stage',
  mid_size: '🏢 Mid-size',
  enterprise: '🌐 Enterprise'
};

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// ─── Main Enricher ────────────────────────────────────────────────────────

export async function enrichCompany(companyName, domain = '', projectDetails = '') {
  // Return cache if still fresh
  const cached = getEnrichment(companyName);
  if (cached && cached.fetch_status === 'done' && cached.description) {
    const age = Math.floor(Date.now() / 1000) - (cached.fetched_at || 0);
    if (age < CACHE_TTL_SECONDS) return cached;
  }

  const genAI = getClient();
  if (!genAI) {
    console.warn('[Enricher] GEMINI_API_KEY not set — skipping enrichment');
    const empty = { fetch_status: 'skipped' };
    saveEnrichment(companyName, empty);
    return empty;
  }

  console.log(`[Enricher] Fetching info via Gemini for: ${companyName}`);

  try {
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

Scale definitions:
- early_startup: less than 50 employees or seed/Series A
- growth_stage: Series B/C, 50-500 employees
- mid_size: 500-5000 employees
- enterprise: 5000+ employees or publicly listed or large MNC`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip markdown fences if present
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/,'').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object in Gemini response');

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
      linkedin_url: null,
      fetch_status: 'done'
    };

    saveEnrichment(companyName, enrichment);
    return enrichment;

  } catch (err) {
    console.error(`[Enricher] Failed for ${companyName}:`, err.message);
    const errorResult = { fetch_status: 'error' };
    saveEnrichment(companyName, errorResult);
    return errorResult;
  }
}

// ─── Queue-based background enricher ─────────────────────────────────────

const enrichQueue = [];
let isProcessing = false;

export function queueEnrichment(companyName, domain, projectDetails) {
  const existing = enrichQueue.find(e => e.name === companyName);
  if (!existing) enrichQueue.push({ name: companyName, domain, projectDetails });
  if (!isProcessing) processQueue();
}

async function processQueue() {
  if (enrichQueue.length === 0) { isProcessing = false; return; }
  isProcessing = true;
  const { name, domain, projectDetails } = enrichQueue.shift();
  try { await enrichCompany(name, domain, projectDetails); } catch {}
  setTimeout(processQueue, 1000);
}
