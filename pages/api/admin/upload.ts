// pages/api/admin/upload.ts
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type Row = {
  term?: string | null;
  definition?: string | null;
  deck?: string | null;
  created_at?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as { rows?: Row[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!rows.length) {
      return res.status(400).json({ ok: false, error: 'No rows provided' });
    }

    const sanitized = rows.map(r => ({
      term: r.term?.trim() || null,
      definition: r.definition?.trim() || null,
      deck: (r.deck ?? 'Global').trim() || null,
      created_at: r.created_at ?? null,
    }));

    const { data, error, count } = await supabaseAdmin
      .from('cards')  // ✅ single source of truth
      .upsert(sanitized, {
        onConflict: 'dedupe_key', // uses the dedupe key you created earlier
        ignoreDuplicates: false,
        count: 'exact',
      })
      .select('id, term, definition, deck, created_at');

    if (error) {
      console.error('upload upsert error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      count: count ?? data?.length ?? 0,
      sample: data?.slice(0, 5) ?? [],
    });
  } catch (e: any) {
    console.error('upload exception:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

