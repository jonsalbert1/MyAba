import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  // Example: just check if we can talk to Supabase
  const { data, error } = await supabaseAdmin.from('profiles').select('*').limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, data });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


