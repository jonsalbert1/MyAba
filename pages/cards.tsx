// pages/api/cards.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase
    .from('cards')   // 👈 changed from 'flashcards'
    .select('id, term, definition')
    .order('id');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ cards: data ?? [] });
}
