import { createClient } from "@supabase/supabase-js";

export default async function handler(_: any, res: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) return res.status(500).json({ ok: false, error: "Missing envs" });

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.from("cards").select("id, term").limit(1);
  return res.status(error ? 500 : 200).json({ ok: !error, error: error?.message, sample: data });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


