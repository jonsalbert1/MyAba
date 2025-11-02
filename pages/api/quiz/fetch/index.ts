import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** GET /api/quiz/fetch?domain=A&code=A1&limit=10&shuffle=1&debug=1 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Cache-Control", "no-store");
      return res.status(405).json({ ok: false, error: "Use GET" });
    }

    const domain = String(req.query.domain ?? "").trim();
    const code   = String(req.query.code ?? "").trim();
    const limit  = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
    const shuffle = !!req.query.shuffle;
    const debug   = !!req.query.debug;

    // Select ALL fields the runner expects
    let q = supabaseAdmin
      .from("quiz_questions")
      .select(
        [
          "id",
          "domain",
          "subdomain",
          "subdomain_text",
          "statement",
          "question",
          "a","b","c","d",
          "correct_answer",
          "rationale_correct",
          "rationale_a","rationale_b","rationale_c","rationale_d",
          "created_at"
        ].join(", "),
        { count: "exact" }
      );

    // Case-insensitive filters
    // If your DB has variants like "a1" or "A-1", switch to %...% partials below.
    if (domain) q = q.ilike("domain", domain);
    if (code)   q = q.ilike("subdomain", code);

    // For more forgiving matching, use this instead:
    // if (domain) q = q.ilike("domain", `%${domain}%`);
    // if (code)   q = q.ilike("subdomain", `%${code}%`);

    q = q.limit(limit);

    const { data, error, count } = await q;
    if (error) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(500).json({ ok: false, error: error.message });
    }

    let rows = Array.isArray(data) ? data : [];
    if (shuffle) rows = rows.slice().sort(() => Math.random() - 0.5);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      count: count ?? null,
      ...(debug ? { filters: { domain, code, limit, shuffle }, sample: rows.slice(0, 3) } : {}),
      data: rows,
    });
  } catch (e: any) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ ok: false, error: e?.message ?? "Unexpected error" });
  }
}
