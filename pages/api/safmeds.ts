import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const deck = (req.query.deck as string) || process.env.GLOBAL_DECK_ID || 'GLOBAL';
      const { data, error } = await supabase
        .from('safmeds_sessions')
        .select('*')
        .eq('deck', deck)
        .order('run_started_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'POST') {
      const { deck, correct, incorrect, duration_seconds, notes } = req.body || {};
      const payload = {
        deck: deck ?? (process.env.GLOBAL_DECK_ID || 'GLOBAL'),
        correct: Number(correct ?? 0),
        incorrect: Number(incorrect ?? 0),
        duration_seconds: Number(duration_seconds ?? 60),
        notes: notes ?? null,
      };
      const { data, error } = await supabase.from('safmeds_sessions').insert([payload]).select().single();
      if (error) throw error;
      return res.status(201).json({ ok: true, data });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
