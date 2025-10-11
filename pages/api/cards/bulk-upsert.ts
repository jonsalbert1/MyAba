// pages/api/cards/bulk-upsert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type Card = { term: string; def: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !service) return res.status(500).json({ ok: false, error: "Missing Supabase env vars" });

  const supabase = createClient(url, service);
  const body = req.body as Card[] | unknown;
  if (!Array.isArray(body)) return res.status(400).json({ ok: false, error: "Body must be an array" });

  const rows = body
    .map(x => ({ term: String(x?.term ?? "").trim(), def: String(x?.def ?? "").trim() }))
    .filter(x => x.term && x.def);

  if (rows.length === 0) return res.status(400).json({ ok: false, error: "No valid rows" });

  const { error } = await supabase.from("cards").upsert(rows, { onConflict: "term" });
  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.status(200).json({ ok: true, count: rows.length });
}
