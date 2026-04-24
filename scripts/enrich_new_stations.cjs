#!/usr/bin/env node
// Enriches only the newly-added stations (fetch_status !== 'done').
// Run: node scripts/enrich_new_stations.cjs
// Uses GROQ_API_KEY from env.

const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, '../frontend/src/companies_data.json');
const outPath = path.join(__dirname, '../frontend/src/enrichments_data.json');

const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
let existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) { console.error('Set GROQ_API_KEY'); process.exit(1); }

const SCALE_BADGE_MAP = {
  early_startup: '🌱 Early Startup',
  growth_stage: '🚀 Growth Stage',
  mid_size: '🏢 Mid-size',
  enterprise: '🌐 Enterprise',
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchEnrichmentOnce(companyName) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: `You are a company research assistant with deep knowledge of Indian companies, PSUs, and government organizations. Research "${companyName}".

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

Scale rules: early_startup=<50 employees, growth_stage=50-500, mid_size=500-5000, enterprise=5000+ OR listed OR government.
Return ONLY the JSON.` }],
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
      const msMatch = msg.match(/in (\d+)ms/);
      const sMatch = msg.match(/in ([\d.]+)s/);
      if (msMatch) retryMs = parseInt(msMatch[1]);
      else if (sMatch) retryMs = Math.ceil(parseFloat(sMatch[1]) * 1000);
      if (msg.includes('tokens per day') || msg.includes('TPD')) return { type: 'tpd' };
      if (response.status === 429) return { type: 'tpm', retryMs };
    } catch {}
    return { type: 'error', message: `Groq ${response.status}` };
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content || '';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { type: 'error', message: 'No JSON' };

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

async function fetchWithRetry(name, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await fetchEnrichmentOnce(name);
    if (result.type === 'ok') return result.data;
    if (result.type === 'tpd') throw new Error('TPD_LIMIT');
    if (result.type === 'tpm') {
      const wait = result.retryMs + 500;
      process.stdout.write(`  [TPM ${(wait/1000).toFixed(1)}s] `);
      await sleep(wait);
    } else throw new Error(result.message);
  }
  throw new Error('Too many retries');
}

async function main() {
  // Only newly added stations that don't have full enrichment
  const todo = [...new Set(
    companies
      .filter(c => c.is_newly_added && existing[c.name]?.fetch_status !== 'done')
      .map(c => c.name)
  )];

  console.log(`Enriching ${todo.length} new stations...`);

  for (let i = 0; i < todo.length; i++) {
    const name = todo[i];
    process.stdout.write(`[${i + 1}/${todo.length}] ${name.slice(0, 50)} ... `);

    try {
      const enrichment = await fetchWithRetry(name);
      // Preserve existing company_type and accommodation from classify_type / add_accommodation
      existing[name] = { ...existing[name], ...enrichment };
      console.log(`✓ ${enrichment.scale_badge || 'no scale'}`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (err.message === 'TPD_LIMIT') {
        console.log('Daily limit reached — saving and stopping. Re-run tomorrow.');
        break;
      }
    }

    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    if (i < todo.length - 1) await sleep(7000);
  }

  const done = Object.values(existing).filter(e => e.fetch_status === 'done').length;
  console.log(`\nDone. ${done} total fully enriched.`);
}

main().catch(console.error);
