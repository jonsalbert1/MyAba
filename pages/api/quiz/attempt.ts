// pages/api/quiz/attempt.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { json } from "@/lib/api-helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

    const { subdomain, question_id, choice, user_id } = req.body || {};
    const choiceNorm = String(choice || "").toLowerCase();

    if (!subdomain || !question_id || !/^[a-d]$/.test(choiceNorm)) {
      return json(res, 400, { ok: false, error: "Missing/invalid fields (need subdomain, question_id, choice in a-d)" });
    }

    const q = await supabase
      .from("quiz_questions")
      .select("id, correct")
      .eq("id", question_id)
      .single();

    if (q.error || !q.data) {
      return json(res, 400, {
        ok: false,
        error: q.error?.message || "Question not found",
        code: (q.error as any)?.code,
        details: (q.error as any)?.details,
      });
    }

    const is_correct = q.data.correct === choiceNorm;

    const insert = { user_id: user_id ?? null, subdomain, question_id, choice: choiceNorm, is_correct };
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert(insert)
      .select()
      .single();

    if (error) {
      return json(res, 500, {
        ok: false,
        error: error.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
      });
    }

    return json(res, 200, { ok: true, data: { ...data, is_correct } });
  } catch (e: any) {
    return json(res, 500, { ok: false, error: e.message || "Unexpected error" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
