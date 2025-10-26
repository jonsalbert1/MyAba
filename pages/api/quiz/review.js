// pages/api/quiz/review.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";


const TABLE = process.env.QUIZ_TABLE_NAME || "quiz_questions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabase = createPagesServerClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const code = String(req.query.code || "").toUpperCase();
  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  // join quiz_answers with quiz_questions to get answer + question text + rationale
  const { data, error } = await supabase
    .from("quiz_answers")
    .select(`
      question_id,
      choice,
      is_correct,
      answered_at,
      quiz_questions (
        ordinal,
        subdomain,
        question,
        a,
        b,
        c,
        d,
        correct_answer,
        rationale_correct
      )
    `)
    .eq("user_id", user.id)
    .eq("quiz_questions.subdomain", code)
    .order("quiz_questions.ordinal", { ascending: true });

  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.status(200).json({ ok: true, data });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req, res) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
