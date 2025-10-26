import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);

  const { question_id, code, selected, correct } = req.body as {
    question_id: string; code: string; selected: "A"|"B"|"C"|"D"; correct: "A"|"B"|"C"|"D";
  };

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const is_correct = selected === correct;

  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: user.id, question_id, code, selected, correct, is_correct,
  });

  if (error) return res.status(400).json({ ok: false, error: error.message });
  res.json({ ok: true, is_correct });
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
