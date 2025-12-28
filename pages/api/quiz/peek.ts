import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** GET /api/quiz/peek?limit=5 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const limit = Math.max(1, Math.min(20, Number(req.query.limit ?? 5)));
    const { data, error } = await supabaseAdmin
      .from("quiz_questions_v2")
      .select("id, domain, subdomain, question")
      .order("subdomain", { ascending: true })
      .limit(limit);

    if (error) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ ok: false, error: e?.message ?? "Unexpected error" });
  }
}
