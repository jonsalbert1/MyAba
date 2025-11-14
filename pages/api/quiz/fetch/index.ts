// pages/api/quiz/fetch/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/quiz/fetch?domain=A&code=A1&limit=10&shuffle=1&debug=1
 * Returns quiz questions from Supabase.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Use GET" });
    }

    const domain = String(req.query.domain ?? "").trim().toUpperCase();
    const codeUpper = String(req.query.code ?? "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
    const shuffle = req.query.shuffle === "1" || req.query.shuffle === "true";
    const debug = req.query.debug === "1" || req.query.debug === "true";

    // ✅ Build base query with only existing columns
    let q = supabaseAdmin
      .from("quiz_questions")
      .select(
        `
        id,
        exam_name,
        domain,
        domain_text,
        subdomain,
        subdomain_text,
        question,
        a, b, c, d,
        correct_answer,
        rationale_correct,
        data_id,
        date,
        published,
        created_at
      `,
        { count: "exact" }
      );

    // ✅ Apply filters
    if (domain) q = q.ilike("domain", domain);      // domain = "A"..."I"
    if (codeUpper) q = q.eq("subdomain", codeUpper); // subdomain = "A1", "B2", etc.

    // Optional filter for published visibility
    q = q.or("published.is.true,published.is.null");

    // Order & limit
    q = q.order("id", { ascending: true }).limit(limit);

    const { data, error, count } = await q;

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message,
        hint: "Check that the 'quiz_questions' table and its columns exist in Supabase.",
      });
    }

    // ✅ Always return an array
    let rows = Array.isArray(data) ? data : [];
    if (shuffle) rows = [...rows].sort(() => Math.random() - 0.5);

    return res.status(200).json({
      ok: true,
      count: count ?? null,
      ...(debug
        ? { filters: { domain, code: codeUpper, limit, shuffle }, sample: rows.slice(0, 3) }
        : {}),
      data: rows,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message ?? "Unexpected error",
    });
  }
}
