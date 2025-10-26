// pages/api/quiz/next.js
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

const PAGE = 10;
const TABLE = process.env.QUIZ_TABLE_NAME || "quiz_questions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabase = createPagesServerClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const code = String(req.query.code || "").toUpperCase();
  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  // Count total rows for this subdomain (boolean true → text 'true' → no filter)
  async function countWith(filters) {
    let q = supabase.from(TABLE).select("id", { count: "exact", head: true });
    for (const [k, v] of filters) q = q.eq(k, v);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  let totalCount = 0;
  try {
    totalCount = await countWith([["subdomain", code], ["is_active", true]]);
    if (totalCount === 0)
      totalCount = await countWith([["subdomain", code], ["is_active", "true"]]);
    if (totalCount === 0) totalCount = await countWith([["subdomain", code]]);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Count failed" });
  }

  if (totalCount === 0) {
    return res.status(200).json({
      ok: true,
      data: [],
      meta: { status: "no_items", totalCount: 0, totalBatches: 0, batch: 0 },
    });
  }

  const totalBatches = Math.max(1, Math.ceil(totalCount / PAGE));

  // progress → which batch is next
  const { data: prog } = await supabase
    .from("quiz_progress")
    .select("last_completed_batch")
    .eq("user_id", user.id)
    .eq("subdomain", code)
    .maybeSingle();

  const completedBatches = prog?.last_completed_batch ?? 0;
  const nextBatch = Math.min(completedBatches + 1, totalBatches);

  const startOrd = (nextBatch - 1) * PAGE + 1;
  const endOrd = Math.min(nextBatch * PAGE, totalCount);

  // Fetch items for the current window (boolean true → text 'true' → no is_active)
  async function selectWindow(isActiveMode) {
    let q = supabase
      .from(TABLE)
      .select("id, ordinal, subdomain, question, a, b, c, d, correct_answer, rationale_correct")
      .eq("subdomain", code)
      .gte("ordinal", startOrd)
      .lte("ordinal", endOrd)
      .order("ordinal", { ascending: true });

    if (isActiveMode === "bool") q = q.eq("is_active", true);
    if (isActiveMode === "text") q = q.eq("is_active", "true");

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  let items = [];
  try {
    items = await selectWindow("bool");
    if (items.length === 0) items = await selectWindow("text");
    if (items.length === 0) items = await selectWindow(null);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Query failed" });
  }

  // Count answered in this window
  let answeredDistinct = 0;
  if (items.length) {
    const ids = items.map((r) => r.id);
    const { data: ans, error: ansErr } = await supabase
      .from("quiz_answers")
      .select("question_id")
      .eq("user_id", user.id)
      .in("question_id", ids);
    if (ansErr) return res.status(500).json({ ok: false, error: ansErr.message });
    answeredDistinct = new Set((ans ?? []).map((x) => x.question_id)).size;
  }

  return res.status(200).json({
    ok: true,
    data: items,
    meta: {
      status: answeredDistinct >= PAGE ? "batch_complete" : "ready",
      totalCount,
      totalBatches,
      batch: nextBatch,
      startOrd,
      endOrd,
      answeredInBatch: answeredDistinct,
    },
  });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.

