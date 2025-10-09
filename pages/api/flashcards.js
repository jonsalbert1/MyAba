import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const deck = (process.env.GLOBAL_DECK_ID || '').trim();
  if (!url || !key) { res.status(500).json({ error: 'Missing Supabase env vars' }); return; }

  const db = createClient(url, key);

  try {
    let q = db.from('flashcards').select('*').order('id', { ascending: true });
    if (deck) q = q.eq('deck_id', deck);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const out = (data ?? []).map(r => ({
      id: r.id,
      term: r.term ?? r.question ?? '',
      def: r.def ?? r.definition ?? r.answer ?? '',
      domain: r.domain ?? null
    }));

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'DB error', message: String(e?.message || e) });
  }
}
