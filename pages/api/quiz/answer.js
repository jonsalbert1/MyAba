// pages/api/quiz/answer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";


const TABLE = process.env.QUIZ_TABLE_NAME || "quiz_questions";
const PAGE = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  const supabase = createPagesServerClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const { question_id, choice } = req.body ?? {};
  if (!question_id || !choice) {
    return res.status(400).json({ ok: false, error: "Missing question_id or choice" });
  }

  // fetch question to validate & get subdomain/batch position
  const { data: q } = await supabase
    .from(TABLE)
    .select("id, subdomain, ordinal, correct_answer")
    .eq("id", question_id)
    .maybeSingle();

  if (!q) return res.status(404).json({ ok: false, error: "Question not found" });

  const is_correct = String(choice).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();

  // upsert answer (idempotent per user+question)
  const { error: insErr } = await supabase.from("quiz_answers").upsert(
    {
      user_id: user.id,
      question_id: q.id,
      choice,
      is_correct,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" }
  );
  if (insErr) return res.status(500).json({ ok: false, error: insErr.message });

  // check if current batch is now complete (10 answered in its window)
  // derive current batch number from ordinal
  const batch = Math.floor((q.ordinal - 1) / PAGE) + 1;
  const startOrd = (batch - 1) * PAGE + 1;
  const endOrd = startOrd + PAGE - 1;

  // get the 10 ids in this batch
  const { data: batchQs } = await supabase
    .from(TABLE)
    .select("id")
    .eq("subdomain", q.subdomain)
    .gte("ordinal", startOrd)
    .lte("ordinal", endOrd)
    .is("is_active", true);

  const ids = (batchQs ?? []).map((r) => r.id);
  let answeredCount = 0;
  if (ids.length) {
    const { data: ans } = await supabase
      .from("quiz_answers")
      .select("question_id")
      .eq("user_id", user.id)
      .in("question_id", ids);
    answeredCount = new Set((ans ?? []).map((x) => x.question_id)).size;
  }

  // If all 10 answered, bump progress.last_completed_batch (only forward)
  if (answeredCount >= PAGE) {
    const { data: prog } = await supabase
      .from("quiz_progress")
      .select("last_completed_batch")
      .eq("user_id", user.id)
      .eq("subdomain", q.subdomain)
      .maybeSingle();

    const last = prog?.last_completed_batch ?? 0;
    if (batch > last) {
      await supabase.from("quiz_progress").upsert(
        { user_id: user.id, subdomain: q.subdomain, last_completed_batch: batch, updated_at: new Date().toISOString() },
        { onConflict: "user_id,subdomain" }
      );
    }
  }

  return res.status(200).json({
    ok: true,
    data: { is_correct, batchAnsweredCount: answeredCount },
  });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req, res) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
