// pages/api/quiz/probe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const domain = String(req.query.domain ?? "").toUpperCase();
    const code   = String(req.query.code ?? "").toUpperCase();
    if (!domain || !code) return res.status(400).json({ ok: false, error: "domain and code required" });

    const numeric = code.replace(/^[A-I]/i, ""); // "A1" -> "1"
    const attempts: any[] = [];

    async function run(name: string, q: any) {
      const { data, error } = await q.select("*").limit(10);
      attempts.push({
        name,
        count: data?.length ?? 0,
        error: error?.message,
        sample: (data ?? []).slice(0, 2),
      });
      return { data, error };
    }

    // Column inventory
    const { data: cols } = await supabaseAdmin
      .rpc("pg_catalog.pg_table_is_visible", {}) // harmless call to keep admin conn alive
      .select()
      .limit(0)
      .single()
      .catch(() => ({ data: null as any }));
    const { data: columns, error: colErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("*")
      .limit(1);
    const columnNames = columns && columns[0] ? Object.keys(columns[0]) : [];

    // A: subdomain == "A1" + published true
    await run("A: subdomain == code + published", supabaseAdmin
      .from("quiz_questions")
      .eq("subdomain", code)
      .eq("published", true));

    // B: subdomain ILIKE "A1" + published
    await run("B: subdomain ILIKE code + published", supabaseAdmin
      .from("quiz_questions")
      .ilike("subdomain", code)
      .eq("published", true));

    // C: domain == "A" AND subdomain_code == "1" + published
    await run("C: domain + subdomain_code + published", supabaseAdmin
      .from("quiz_questions")
      .eq("domain", domain)
      .eq("subdomain_code", numeric)
      .eq("published", true));

    // D: domain == "A" AND subdomain == "1" + published
    await run("D: domain + subdomain(numeric) + published", supabaseAdmin
      .from("quiz_questions")
      .eq("domain", domain)
      .eq("subdomain", numeric)
      .eq("published", true));

    // E: loose domain prefix + published
    await run("E: subdomain ILIKE 'A%' + published", supabaseAdmin
      .from("quiz_questions")
      .ilike("subdomain", `${domain}%`)
      .eq("published", true));

    // F: (no published filter at all) subdomain == code
    await run("F: subdomain == code (no published filter)", supabaseAdmin
      .from("quiz_questions")
      .eq("subdomain", code));

    // G: table typo check (singular)
    let singularExists = false;
    try {
      const { data: dq } = await supabaseAdmin.from("quiz_question").select("id").limit(1);
      singularExists = Array.isArray(dq);
    } catch {}
    attempts.push({ name: "G: quiz_question exists?", count: singularExists ? 1 : 0 });

    return res.status(200).json({
      ok: true,
      domain, code, numeric,
      columns: columnNames,
      attempts,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "probe failed" });
  }
}
