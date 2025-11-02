// pages/api/quiz/probe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Use: /api/quiz/probe?domain=A&code=A1 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const domain = String(req.query.domain ?? "").toUpperCase();
    const code   = String(req.query.code ?? "").toUpperCase();
    if (!domain || !code) {
      return res.status(400).json({ ok: false, error: "domain and code required" });
    }

    const numeric = code.replace(/^[A-I]/i, ""); // "A1" -> "1"
    const attempts: Array<{ name: string; count: number; error?: string; sample?: any[] }> = [];

    // 0) Column discovery (best effort)
    let columns: string[] = [];
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .limit(1);
      if (!error && data && data[0]) columns = Object.keys(data[0]);
    }

    // Helper to push results
    function push(name: string, data?: any[] | null, error?: any) {
      attempts.push({
        name,
        count: Array.isArray(data) ? data.length : 0,
        error: error?.message,
        sample: (Array.isArray(data) ? data.slice(0, 2) : []),
      });
    }

    // A) subdomain == code + published
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("subdomain", code)
        .eq("published", true)
        .limit(10);
      push("A: subdomain == code + published", data, error);
    }

    // B) subdomain ILIKE code + published
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .ilike("subdomain", code)
        .eq("published", true)
        .limit(10);
      push("B: subdomain ILIKE code + published", data, error);
    }

    // C) domain == A AND subdomain_code == 1 + published
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("domain", domain)
        .eq("subdomain_code", numeric)
        .eq("published", true)
        .limit(10);
      push("C: domain + subdomain_code + published", data, error);
    }

    // D) domain == A AND subdomain == 1 + published
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("domain", domain)
        .eq("subdomain", numeric)
        .eq("published", true)
        .limit(10);
      push("D: domain + subdomain(numeric) + published", data, error);
    }

    // E) loose A% + published
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .ilike("subdomain", `${domain}%`)
        .eq("published", true)
        .limit(10);
      push("E: subdomain ILIKE 'A%' + published", data, error);
    }

    // F) exact subdomain, NO published filter (diagnostic)
    {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .eq("subdomain", code)
        .limit(10);
      push("F: subdomain == code (no published)", data, error);
    }

    // G) singular table check
    let singularExists = false;
    try {
      const { data } = await supabaseAdmin.from("quiz_question").select("id").limit(1);
      singularExists = Array.isArray(data);
    } catch {}
    attempts.push({ name: "G: quiz_question exists?", count: singularExists ? 1 : 0 });

    return res.status(200).json({ ok: true, domain, code, numeric, columns, attempts });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "probe failed" });
  }
}
