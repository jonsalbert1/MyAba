import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url  = (process.env.SUPABASE_URL || '').trim();
  const key  = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const deck = (process.env.GLOBAL_DECK_ID || '').trim(); // optional
  if (!url || !key) { res.status(500).json({ error: 'Missing Supabase env vars' }); return; }
  const db = createClient(url, key);

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const duration = Number(body.durationSeconds ?? body.duration ?? 60);
      const correct  = Number(body.correct  ?? 0);
      const missed   = Number(body.missed   ?? 0);
      const total    = correct + missed;
      const net      = correct - missed;
      const rate     = duration > 0 ? (correct * 60) / duration : 0;
      const started  = body.startedAt ? new Date(body.startedAt).toISOString() : null;

      const row = {
        deck_id: deck || body.deck_id,         // prefer GLOBAL_DECK_ID
        duration_seconds: duration,
        correct, missed, total, net,
        rate_per_min: rate,
        ...(started ? { started_at: started } : {})
      };

      const { data, error } = await db.from('safmeds_sessions').insert(row).select().single();
      if (error) throw new Error(error.message);
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ error: 'DB error', message: String(e?.message || e) });
    }
    return;
  }

  if (req.method === 'GET') {
    const limit = Math.min(100, Number(req.query?.limit ?? 20));
    try {
      let q = db.from('safmeds_sessions')
        .select('id, duration_seconds, correct, missed, net, total, rate_per_min, started_at')
        .order('started_at', { ascending: true })
        .limit(limit);
      if (deck) q = q.eq('deck_id', deck);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      res.status(200).json(data ?? []);
    } catch (e) {
      res.status(500).json({ error: 'DB error', message: String(e?.message || e) });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req, res) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
