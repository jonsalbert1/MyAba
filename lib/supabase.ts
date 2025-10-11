// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Browser client (use ONLY anon + NEXT_PUBLIC_* on the client)
export const supabaseBrowser = () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, anon, { auth: { persistSession: true } });
};
