// pages/api/aba/flashcards.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); // SERVER ONLY
const deckId = (process.env.GLOBAL_DECK_ID || '').trim();

const supabase = createClient(url, key, { auth: { persistSession: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('id', { ascending: true });
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'POST') {
      const body = req.body as Array<{ term: string; def: string }>;
      if (!Array.isArray(body)) return res.status(400).json({ ok: false, error: 'Expected array of {term,def}' });

      const rows = body.map(r => ({ deck_id: deckId, term: r.term, def: r.def }));
      const { error } = await supabase.from('flashcards').insert(rows);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(201).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
}
