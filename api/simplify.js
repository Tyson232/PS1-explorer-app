export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API not configured' });
  }

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
            content: `The following is a project description for a student internship. Simplify it in 3-4 lines in plain simple English that any non-technical student can understand. Avoid jargon. Be concise and clear.

Project details: ${text.trim()}

Reply with only the simplified description. No preamble, no labels, no extra text.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const simplified = json.choices?.[0]?.message?.content?.trim();
    if (!simplified) throw new Error('Empty response');

    res.json({ simplified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
