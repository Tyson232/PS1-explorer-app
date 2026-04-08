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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.json({ enrichment: { fetch_status: 'skipped' }, cached: false });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: `You are a company research assistant. Provide detailed, accurate information about the company "${companyName}".

Return ONLY a valid JSON object with these fields (use null only if truly unknown, otherwise make your best inference):
{
  "description": "3-4 sentences: what they do, their main products/services, key markets, and what makes them notable",
  "founding_year": "YYYY",
  "hq": "City, Country",
  "website": "domain.com (without https://)",
  "employee_count": "specific range like '50,000+' or '500-1000'",
  "scale": "early_startup|growth_stage|mid_size|enterprise",
  "funding_stage": "e.g. Series B, Series C, Public, Bootstrapped, Acquired",
  "investors": ["list up to 5 notable investors or parent company"],
  "tech_stack": ["list 6-8 specific technologies, languages, frameworks, or platforms they are known for"],
  "culture_snippet": "one specific, interesting sentence about their work culture, values, or what employees say"
}

Scale definitions: early_startup = <50 employees, growth_stage = 50-500, mid_size = 500-5000, enterprise = 5000+ or publicly listed.
Return ONLY the JSON object. No markdown fences, no explanation, no extra text.`
          }
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    const data = JSON.parse(match[0]);
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

    cache.set(companyName, enrichment);
    res.json({ enrichment, cached: false });
  } catch (err) {
    res.json({ enrichment: { fetch_status: 'error', message: err.message }, cached: false });
  }
}
