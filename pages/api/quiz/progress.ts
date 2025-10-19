import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase, json } from "../_supabaseAdmin";

// Completed = 10 distinct questions answered in the subdomain (any correctness)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method not allowed" });
    const domain = String(req.query.domain || "").toUpperCase();
    if (!/^[A-I]$/.test(domain)) return json(res, 400, { ok: false, error: "Bad domain" });

    // get distinct subdomains for domain
    const subs = await supabase.from("quiz_questions")
      .select("subdomain")
      .ilike("subdomain", `${domain}%`); // A%, B%, etc.

    if (subs.error) return json(res, 500, { ok: false, error: subs.error.message });

    const subSet = Array.from(new Set((subs.data || []).map(r => r.subdomain)));
    const results: Record<string, { answeredDistinct: number; complete: boolean }> = {};

    // Count distinct questions answered per subdomain
    for (const sub of subSet) {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("question_id")
        .eq("subdomain", sub);

      if (error) continue;
      const distinct = new Set((data || []).map(r => r.question_id)).size;
      results[sub] = { answeredDistinct: distinct, complete: distinct >= 10 };
    }

    // remaining = how many known subdomains are not yet complete
    const remaining = Object.values(results).filter(v => !v.complete).length;

    return json(res, 200, { ok: true, data: { domain, results, remaining } });
  } catch (e:any) {
    return json(res, 500, { ok: false, error: e.message });
  }
}
