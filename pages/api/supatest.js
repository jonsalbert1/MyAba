// pages/api/supatest.js
export default async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  // Try 'quiz' first, change to 'quizzes' if your table is plural
  const endpoint = url + '/rest/v1/quiz?select=id&limit=1';

  try {
    const r = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key
      }
    });
    const body = await r.text();
    res.status(200).json({ status: r.status, ok: r.ok, body, endpoint });
  } catch (e) {
    res.status(200).json({ error: String(e?.message || e), endpoint });
  }
}
