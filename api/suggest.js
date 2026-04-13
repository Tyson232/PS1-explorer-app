import { GoogleAuth } from 'google-auth-library';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: process.env.GOOGLE_CLIENT_EMAIL?.trim(),
      private_key: process.env.GOOGLE_PRIVATE_KEY,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { suggestion, name, type } = req.body || {};
  if (!suggestion?.trim()) return res.status(400).json({ error: 'Suggestion required' });

  const tab = type === 'query' ? "queries to PS coordi's" : 'Sheet1';

  try {
    const token = await getAccessToken();

    const row = [
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      name?.trim() || 'Anonymous',
      suggestion.trim(),
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${tab}!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.text();
      throw new Error(err);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
