// pages/api/admin/upload-quiz.ts
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: {
      // allow larger CSV payloads
      sizeLimit: "10mb",
    },
  },
};

const TABLE = process.env.QUIZ_TABLE_NAME || "quiz_questions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // 1) Auth + admin check using cookie-aware server helper
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    console.error("[upload-quiz] getUser error:", userErr.message);
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    console.error("[upload-quiz] profile fetch error:", profErr.message);
    return res.status(500).json({ ok: false, error: profErr.message });
  }
  if (!profile?.is_admin) return res.status(403).json({ ok: false, error: "Forbidden" });

  // 2) Validate payload
  const rows = (req.body?.rows || []) as any[];
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ ok: false, error: "No rows provided" });
  }

  // 3) Normalize & coerce fields
  const cleaned = rows.map((r) => ({
    subdomain: (r.subdomain ?? "").toString().trim(),
    subdomain_text: (r.subdomain_text ?? "").toString().trim(),
    statement: (r.statement ?? "").toString().trim(),
    question: (r.question ?? "").toString().trim(),
    a: (r.a ?? "").toString().trim(),
    b: (r.b ?? "").toString().trim(),
    c: (r.c ?? "").toString().trim(),
    d: (r.d ?? "").toString().trim(),
    correct_answer: (r.correct_answer ?? "").toString().trim(),
    rationale_correct: (r.rationale_correct ?? "").toString().trim(),
    rationale_a: (r.rationale_a ?? "").toString().trim(),
    rationale_b: (r.rationale_b ?? "").toString().trim(),
    rationale_c: (r.rationale_c ?? "").toString().trim(),
    rationale_d: (r.rationale_d ?? "").toString().trim(),
    is_active: String(r.is_active ?? "true").toLowerCase() !== "false",
  }));

  // 4) Upsert using service role (bypass RLS for admin)
  // Make sure you created a unique index:
  //   create unique index if not exists uq_quiz_questions_subdomain_statement
  //   on public.quiz_questions (subdomain, statement);
  const { error } = await supabaseAdmin
    .from(TABLE)
    .upsert(cleaned, {
      onConflict: "subdomain,statement", // uses the unique index above
      returning: "minimal",
    });

  if (error) {
    console.error("[upload-quiz] upsert error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, upserted: cleaned.length });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

