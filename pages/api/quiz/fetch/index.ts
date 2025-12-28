// pages/api/quiz/fetch/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DomainLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

const DOMAIN_COUNTS: Record<DomainLetter, number> = {
  A: 5,
  B: 24,
  C: 12,
  D: 9,
  E: 12,
  F: 8,
  G: 19,
  H: 8,
  I: 7,
};

function makeSubdomainCode(domain: DomainLetter, index: number): string {
  return `${domain}${index.toString().padStart(2, "0")}`;
}

/**
 * Accepts:
 *  - ?domain=A&code=A01
 *  - ?code=A01              (domain inferred from code)
 *  - ?domain=A&code=1       (code inferred to A01)
 */
function normalizeDomainAndCode(req: NextApiRequest): {
  domain: DomainLetter | null;
  code: string | null; // canonical, e.g. "C03"
} {
  const rawDomain = String(req.query.domain ?? "").toUpperCase().trim();
  const rawCode = String(req.query.code ?? "").toUpperCase().trim();

  // Infer domain if not explicitly provided
  let domain: DomainLetter | null = null;

  if (rawDomain && ["A", "B", "C", "D", "E", "F", "G", "H", "I"].includes(rawDomain)) {
    domain = rawDomain as DomainLetter;
  } else if (/^[A-I][0-9]+$/.test(rawCode)) {
    domain = rawCode[0] as DomainLetter;
  } else {
    return { domain: null, code: null };
  }

  if (!rawCode) return { domain: null, code: null };

  let num: number | null = null;

  // Case 1: "C1", "C01", "C10", etc.
  if (/^[A-I][0-9]+$/.test(rawCode)) {
    if (rawCode[0] !== domain) {
      return { domain: null, code: null };
    }
    num = Number(rawCode.slice(1));
  }
  // Case 2: "1", "2", "10" (just the number)
  else if (/^[0-9]+$/.test(rawCode)) {
    num = Number(rawCode);
  } else {
    return { domain: null, code: null };
  }

  if (!Number.isFinite(num) || num <= 0 || num > DOMAIN_COUNTS[domain]) {
    return { domain: null, code: null };
  }

  const canonicalCode = makeSubdomainCode(domain, num);
  return { domain, code: canonicalCode };
}

type FetchResponse =
  | {
      ok: true;
      domain: DomainLetter;
      code: string;
      source: "quiz_questions_v2";
      count: number;
      items: any[];
      debug?: any;
    }
  | { ok: false; error: string; details?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FetchResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Use GET" });
    }

    const { domain, code } = normalizeDomainAndCode(req);

    if (!domain || !code) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid domain or code" });
    }

    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
    const shuffle = req.query.shuffle === "1" || req.query.shuffle === "true";
    const debug = req.query.debug === "1" || req.query.debug === "true";

    const selectCols = `
      id,
      domain,
      subdomain,
      subdomain_text,
      question,
      a,
      b,
      c,
      d,
      correct_answer,
      rationale_correct,
      image_path
    `;

    const runQuery = async (table: "quiz_questions_v2") => {
      let q = supabaseAdmin
        .from(table)
        .select(selectCols)
        .eq("domain", domain)
        .eq("subdomain", code);

      q = shuffle
        ? q.order("id", { ascending: false })
        : q.order("id", { ascending: true });

      q = q.limit(limit);

      return q;
    };

    // ✅ Use v2 only (no fallback)
    const source: "quiz_questions_v2" = "quiz_questions_v2";
    const { data, error } = await runQuery("quiz_questions_v2");

    if (error) {
      console.error("Supabase quiz_questions_v2 error:", error);
      return res.status(500).json({
        ok: false,
        error: "Database error",
        details: error.message,
      });
    }

    return res.status(200).json({
      ok: true,
      domain,
      code,
      source,
      count: data?.length ?? 0,
      items: data ?? [],
      debug: debug ? { domain, code, limit, shuffle, source } : undefined,
    });
  } catch (err: any) {
    console.error("Quiz fetch handler error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Unknown error" });
  }
}
