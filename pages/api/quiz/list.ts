// pages/api/quiz/list.ts
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  const deckId = (req.query.deckId as string) || "default";

  const { data, error } = await supabaseAdmin
    .from("quiz_items")
    .select("domain,question,a,b,c,d,answer,rationale")
    .eq("deck_id", deckId)
    .order("id", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ records: data ?? [] });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


