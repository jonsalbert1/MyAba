// pages/api/quiz/questions.ts
// GET /api/quiz/questions?sub=A1&limit=10
// Schema-tolerant: select('*') then normalize (question/prompt, correct/correct_answer, etc.)

import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { json } from "@/lib/api-helpers";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const rawSub = String(req.query.sub ?? "");
    const sub = rawSub.trim().toUpperCase();
    const limit = Math.min(10, parseInt(String(req.query.limit || "10"), 10) || 10);

    // Accept A1..I99
    const isValid = /^[A-I][0-9]{1,2}$/.test(sub);
    if (!isValid) {
      // List available subdomains (best-effort)
      const avail = await supabase.from("quiz_questions").select("subdomain").limit(200);
      const options = Array.from(
        new Set((avail.data || []).map((r: any) => String(r.subdomain || "").toUpperCase()).filter(Boolean))
      ).sort();
      return res.status(400).json({
        ok: false,
        error: `Bad subdomain id: '${rawSub}'. Use values like 'A1'.`,
        received: rawSub,
        suggestions: options,
      });
    }

    // Select everything to avoid unknown-column errors; normalize below.
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("subdomain", sub)
      .limit(limit);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const rows = (data || []).slice();

    // Prefer server sort by created_at; if missing, sort by id as fallback
    rows.sort((a: any, b: any) => {
      const ca = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const cb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      if (ca !== cb) return cb - ca;
      const ia = String(a?.id || "");
      const ib = String(b?.id || "");
      return ib.localeCompare(ia);
    });

    const normalized = rows.map((row: any) => ({
      id: row.id,
      domain: row.domain,
      subdomain: row.subdomain,
      // show question as the main prompt; fall back to prompt or statement if needed
      prompt: row.question ?? row.prompt ?? row.statement ?? "",
      // show statement under the question in the UI
      statement: row.statement ?? "",
      a: row.a,
      b: row.b,
      c: row.c,
      d: row.d,
      correct: String(row.correct ?? row.correct_answer ?? "").toLowerCase(),
      rationale_correct: row.rationale_correct ?? null,
      rationale_a: row.rationale_a ?? null,
      rationale_b: row.rationale_b ?? null,
      rationale_c: row.rationale_c ?? null,
      rationale_d: row.rationale_d ?? null,
    }));

    return res.status(200).json({ ok: true, data: normalized });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


