import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) return res.status(500).json({ ok: false, error: "Missing envs" });

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.from("cards").select("id, term").limit(1);
  return res.status(error ? 500 : 200).json({ ok: !error, error: error?.message, sample: data });
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
