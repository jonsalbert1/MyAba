// pages/api/flashcards.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Optional: allow client to specify ?limit and ?from
    const limit = Math.min(parseInt(String(req.query.limit ?? '1000'), 10), 10000);
    const from = Math.max(parseInt(String(req.query.from ?? '0'), 10), 0);
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from('cards') // ✅ same table SAFMEDS uses
      .select('id, term, definition, deck, created_at', { count: 'exact' })
      .order('term', { ascending: true })
      .range(from, to); // no hard-coded 50

    if (error) {
      console.error('flashcards API error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      count: count ?? data?.length ?? 0,
      data,
    });
  } catch (e: any) {
    console.error('flashcards API exception:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
