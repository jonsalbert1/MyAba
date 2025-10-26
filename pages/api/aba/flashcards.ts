// pages/api/aba/flashcards.ts
import { createClient } from "@supabase/supabase-js";

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

if (!url || !anon) {
  // Keep handler defined even if env missing, so Next can compile
  // You can still hit this route for a clear error.
}

const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;

export default async function handler(_req: any, res: any) {
  if (!supabase) {
    return res.status(500).json({ error: "Supabase env vars are missing" });
  }

  try {
    // TODO: adjust table/query for your real schema
    const { data, error } = await supabase.from("flashcards").select("*").limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
