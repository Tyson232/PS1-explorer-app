#!/usr/bin/env node
/**
 * Pre-generates enrichment data for all companies via Groq API.
 * Saves to frontend/src/enrichments_data.json — bundled into the app
 * so every user gets instant tags without API calls.
 *
 * Run: GROQ_API_KEY=... node scripts/generate_enrichments.cjs
 * Resume: re-run — already-fetched companies are skipped.
 */

const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, '..', 'frontend', 'src', 'companies_data.json');
const outPath = path.join(__dirname, '..', 'frontend', 'src', 'enrichments_data.json');

const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

// Load existing results so we can resume
let existing = {};
if (fs.existsSync(outPath)) {
  existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
}

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error('Set GROQ_API_KEY env var first.');
  process.exit(1);
}

const SCALE_BADGE_MAP = {
  early_startup: '🌱 Early Startup',
  growth_stage: '🚀 Growth Stage',
  mid_size: '🏢 Mid-size',
  enterprise: '🌐 Enterprise',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(companyName, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await fetchEnrichmentOnce(companyName);
    if (result.type === 'ok') return result.data;
    if (result.type === 'tpd') throw new Error('TPD_LIMIT');   // daily — stop entirely
    if (result.type === 'tpm') {
      const wait = result.retryMs + 500;
      process.stdout.write(`  [TPM, waiting ${(wait/1000).toFixed(1)}s] `);
      await sleep(wait);
    } else {
      throw new Error(result.message);
    }
  }
  throw new Error('Too many retries');
}

async function fetchEnrichmentOnce(companyName) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `You are a company research assistant with deep knowledge of Indian companies, PSUs, and government organizations. Research "${companyName}".

Return ONLY a valid JSON object:
{
  "description": "3-4 sentences: what they do, main products/services, key markets, what makes them notable",
  "founding_year": "YYYY or null",
  "hq": "City, Country",
  "website": "domain.com (no https://)",
  "employee_count": "specific range like '50,000+' or '500-1000'",
  "scale": "early_startup|growth_stage|mid_size|enterprise",
  "funding_stage": "e.g. Series B, Public, Government, Bootstrapped, Acquired, or null",
  "investors": ["up to 5 notable investors or parent org"],
  "tech_stack": ["6-8 technologies/platforms they use"],
  "culture_snippet": "one specific interesting sentence about their culture or what employees say"
}

Scale rules (be accurate — err toward larger for well-known orgs):
- early_startup = <50 employees, seed/angel stage
- growth_stage = 50–500 employees, Series A/B
- mid_size = 500–5000 employees
- enterprise = 5000+ employees OR publicly listed OR government body OR national institution

Important for Indian context:
- Stock exchanges (NSE, BSE), banks, and listed corporates → enterprise
- Government ministries, PSUs, DRDO labs, IITs, IIMs → enterprise
- Large Indian conglomerates (Tata, Adani, Mahindra group cos) → enterprise
- BITS Pilani stations that are clearly large orgs → enterprise

Return ONLY the JSON. No markdown, no explanation.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let retryMs = 3000;
    try {
      const parsed = JSON.parse(errText);
      const msg = parsed?.error?.message || '';
      // Extract suggested wait time, e.g. "Please try again in 825ms"
      const msMatch = msg.match(/in (\d+)ms/);
      const sMatch = msg.match(/in ([\d.]+)s/);
      if (msMatch) retryMs = parseInt(msMatch[1]);
      else if (sMatch) retryMs = Math.ceil(parseFloat(sMatch[1]) * 1000);

      const isTPD = msg.includes('tokens per day') || msg.includes('TPD');
      if (isTPD) return { type: 'tpd' };
      if (response.status === 429) return { type: 'tpm', retryMs };
    } catch {}
    return { type: 'error', message: `Groq ${response.status}` };
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content || '';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { type: 'error', message: 'No JSON in response' };

  const data = JSON.parse(jsonMatch[0]);
  return {
    type: 'ok',
    data: {
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
      fetch_status: 'done',
    },
  };
}

async function main() {
  const todo = companies.filter(c => !existing[c.name]);
  console.log(`Total: ${companies.length} | Already done: ${Object.keys(existing).length} | Remaining: ${todo.length}`);

  for (let i = 0; i < todo.length; i++) {
    const company = todo[i];
    process.stdout.write(`[${i + 1}/${todo.length}] ${company.name} ... `);

    try {
      const enrichment = await fetchWithRetry(company.name);
      existing[company.name] = enrichment;
      console.log(`✓ ${enrichment.scale_badge || 'no scale'}`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (err.message === 'TPD_LIMIT') {
        console.log('Daily token limit reached — saving progress and stopping. Re-run tomorrow.');
        break;
      }
    }

    // Save after every company so progress survives interruption
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));

    // 7s between calls to stay within TPM limits
    if (i < todo.length - 1) await sleep(7000);
  }

  const done = Object.keys(existing).length;
  console.log(`\nDone: ${done}/${companies.length} companies saved to ${outPath}`);
}

main().catch(console.error);
