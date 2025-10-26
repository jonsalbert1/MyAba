// pages/api/quiz/continue.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

const TABLE = process.env.QUIZ_TABLE_NAME || "quiz_questions";
const PAGE = 10;

export default async function handler(req, res) {
  const supabase = createPagesServerClient({ req, res });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  // Get all subdomains present in questions
  const { data: subs } = await supabase
    .from(TABLE)
    .select("subdomain")
    .is("is_active", true);
  const allCodes = [...new Set((subs || []).map(r => r.subdomain))].sort();

  // For each code, figure out next batch and if it’s incomplete
  for (const code of allCodes) {
    // total Q
    const { count: total } = await supabase
      .from(TABLE).select("id", { count: "exact", head: true })
      .eq("subdomain", code).is("is_active", true);
    const totalCount = total ?? 0;
    if (totalCount === 0) continue;

    const totalBatches = Math.ceil(totalCount / PAGE);

    // progress
    const { data: prog } = await supabase
      .from("quiz_progress")
      .select("last_completed_batch")
      .eq("user_id", user.id).eq("subdomain", code).maybeSingle();
    const last = prog?.last_completed_batch ?? 0;
    if (last < totalBatches) {
      // Found the next subdomain that isn’t done
      return res.status(200).json({ ok: true, code });
    }
  }

  // Everything done (or no questions)
  return res.status(200).json({ ok: true, code: null });
}
