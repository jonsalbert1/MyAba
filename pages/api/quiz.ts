// pages/api/quiz.ts
export const config = { runtime: "nodejs" } as const;

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * HARD-LOCKED to the new canonical table.
 * No discovery. No legacy. No surprises.
 */
const TABLE = "quiz_questions";

// Accept either server or public URL envs
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* -------------------- Utils -------------------- */

function normalizeABCD(val?: string | number): "A" | "B" | "C" | "D" {
  const s = String(val ?? "").trim().toUpperCase();
  if (s === "1" || s === "A") return "A";
  if (s === "2" || s === "B") return "B";
  if (s === "3" || s === "C") return "C";
  if (s === "4" || s === "D") return "D";
  return "A";
}

// Replace curly quotes, em/en dashes, ellipses, NBSP, zero-width chars, and �
function cleanText(s: unknown): string | null {
  if (s == null) return null;
  let t = String(s);
  t = t
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\uFFFD/g, "-")
    .trim();
  return t;
}

function cleanChoices<T extends Record<string, any>>(m: T): T {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, cleanText(v)])) as T;
}

// Pick best available prompt (not used in output, but for sanity)
function pickStem(r: any): string {
  return (
    cleanText(r?.question) ||
    cleanText(r?.statement) ||
    cleanText(r?.prompt) ||
    cleanText(r?.subdomain_text) ||
    ""
  )!;
}

/* -------------------- Data loading -------------------- */

async function loadRowsForCode(code: string): Promise<{
  rows: any[];
  usedColumn: string;
  loadInfo: string;
}> {
  // 1) exact match on subdomain (recommended)
  {
    const { data, error } = await supabase.from(TABLE).select("*").eq("subdomain", code).limit(200);
    if (!error && (data?.length || 0) > 0) return { rows: data!, usedColumn: "subdomain", loadInfo: "" };
  }

  // 2) prefix on subdomain_text (e.g., "A1 Identify..." starts with "A1")
  {
    const { data } = await supabase.from(TABLE).select("*").ilike("subdomain_text", `${code}%`).limit(200);
    if ((data?.length || 0) > 0) return { rows: data!, usedColumn: "subdomain_text", loadInfo: "prefix ILIKE" };
  }

  // 3) contains on subdomain_text
  {
    const { data } = await supabase.from(TABLE).select("*").ilike("subdomain_text", `%${code}%`).limit(200);
    if ((data?.length || 0) > 0) return { rows: data!, usedColumn: "subdomain_text", loadInfo: "contains ILIKE" };
  }

  return { rows: [], usedColumn: "none", loadInfo: "No exact/prefix/contains matches." };
}

/* -------------------- API Handler -------------------- */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Debug header: expose which table we use
    res.setHeader("x-quiz-table", TABLE);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
        has_SUPABASE_URL: Boolean(SUPABASE_URL),
        has_SERVICE_ROLE: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      });
    }

    const code = String(req.query.code || "").toUpperCase();
    const limitParam = Number(req.query.limit || 10);
    const debug = String(req.query.debug || "") === "1";

    if (debug && !code) {
      const probe = await supabase.from(TABLE).select("*").limit(1);
      return res.status(200).json({
        ok: true,
        table: TABLE,
        has_SUPABASE_URL: Boolean(SUPABASE_URL),
        has_SERVICE_ROLE: Boolean(SUPABASE_SERVICE_ROLE_KEY),
        sample_keys: probe.data?.[0] ? Object.keys(probe.data[0]) : [],
        error: probe.error?.message || null,
      });
    }

    if (!code) {
      return res.status(400).json({ ok: false, error: "Missing subdomain code" });
    }

    // Determine count (optional subdomains table)
    let target = 10;
    try {
      const { data: sub, error: subErr } = await supabase
        .from("subdomains")
        .select("*")
        .eq("code", code)
        .single();
      if (!subErr && sub && typeof sub.target_items === "number") target = sub.target_items;
    } catch {
      /* ignore */
    }
    const take = Math.min(Math.max(1, limitParam || target), Math.max(1, target));

    // Load rows
    const loaded = await loadRowsForCode(code);
    const rows = loaded.rows || [];
    if (!rows.length) {
      return res.status(200).json({
        ok: true,
        table: TABLE,
        usedColumn: loaded.usedColumn,
        loadInfo: loaded.loadInfo,
        data: [],
      });
    }

    // Ensure required columns exist
    const first = rows[0] || {};
    const required = ["question", "a", "b", "c", "d", "correct_answer"];
    const missing = required.filter((k) => !(k in first));
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        error: `Table '${TABLE}' is missing expected columns: ${missing.join(", ")}`,
        sample_keys: Object.keys(first),
      });
    }

    // Map to flat fields the UI expects (sanitize text)
    const data = rows
      .sort(() => Math.random() - 0.5)
      .slice(0, take)
      .map((r: any) => {
        const cleanedChoices = cleanChoices({ a: r.a, b: r.b, c: r.c, d: r.d });
        const cleanedRationales = cleanChoices({
          rationale_correct: r.rationale_correct,
          rationale_a: r.rationale_a,
          rationale_b: r.rationale_b,
          rationale_c: r.rationale_c,
          rationale_d: r.rationale_d,
        });

        return {
          id: r.id ?? undefined,
          domain: r.domain ?? null,
          subdomain: r.subdomain ?? code,
          subdomain_text: cleanText(r.subdomain_text),
          statement: cleanText(r.statement),
          question: cleanText(r.question) || pickStem(r), // always provide something
          a: cleanedChoices.a,
          b: cleanedChoices.b,
          c: cleanedChoices.c,
          d: cleanedChoices.d,
          correct_answer: normalizeABCD(r.correct_answer),
          ...cleanedRationales,
          is_active: r.is_active ?? true,
          created_at: r.created_at ?? null,
        };
      });

    // Final response (flat fields, key is 'data')
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      table: TABLE,
      usedColumn: loaded.usedColumn,
      loadInfo: loaded.loadInfo,
      data,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}
