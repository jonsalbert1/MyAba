import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const deckId = req.query.deck;
    if (!deckId) {
      return res.status(400).json({ error: 'Missing deck id' });
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('term, def')
      .eq('deck_id', deckId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ deck: deckId, items: data ?? [] });
  } catch (err) {
    console.error('API /decks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.

