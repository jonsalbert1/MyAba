import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const deckId = (req.query.deckId as string) || "default";
  const { data, error } = await supabaseAdmin
    .from("flashcards")
    .select("term, def")
    .eq("deck_id", deckId)
    .order("id", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ records: data ?? [] });
}
