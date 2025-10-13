// pages/api/quiz-bulk.ts
import type { NextApiRequest, NextApiResponse } from "next";

const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// How many rows per PostgREST insert
const BATCH_SIZE = 500;

function ensureEnv() {
  if (!baseUrl) throw new Error("SUPABASE_URL missing");
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
}

type IncomingRow = {
  domain: string;
  subdomain?: string | null;
  question: string; // alias: prompt
  a: string;
  b: string;
  c: string;
  d: string;
  correct: "A" | "B" | "C" | "D";
  rationale?: string | null;
};

/* ---------- text cleanup / safety nets ---------- */
function stripBOM(s: string) {
  if (!s) return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
function repairMojibake(s: string) {
  return s
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€˜/g, "‘")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€¢/g, "•")
    .replace(/â€¦/g, "…")
    .replace(/Ã©/g, "é");
}
function cleanText(x: unknown): string {
  const s0 = String(x ?? "");
  const s1 = stripBOM(s0).trim();
  const s2 = repairMojibake(s1);
  return s2.normalize?.("NFC") ?? s2;
}
function nullIfEmpty(s: string | null | undefined) {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

function normalizeRow(r: any): IncomingRow | null {
  const domain = cleanText(r.domain);
  const subdomain = nullIfEmpty(cleanText(r.subdomain));
  const question = cleanText(r.question ?? r.prompt); // accept question or prompt
  const a = cleanText(r.a);
  const b = cleanText(r.b);
  const c = cleanText(r.c);
  const d = cleanText(r.d);

  let correct = String(r.correct ?? "").trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(correct)) return null;

  const rationale = nullIfEmpty(cleanText(r.rationale ?? r.explanation));

  if (!domain || !question || !a || !b || !c || !d) return null;

  return {
    domain,
    subdomain,
    question,
    a,
    b,
    c,
    d,
    correct: correct as "A" | "B" | "C" | "D",
    rationale,
  };
}

async function insertBatch(batch: any[]) {
  const resp = await fetch(`${baseUrl}/rest/v1/study_quiz_items`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(batch),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase REST ${resp.status} ${resp.statusText}: ${text}`);
  }
  const inserted = (await resp.json()) as any[];
  return inserted.length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    ensureEnv();

    const dryRun = String(req.query.dryRun ?? "") === "1";

    const incoming = Array.isArray(req.body) ? req.body : [];
    if (!incoming.length) {
      return res.status(400).json({ ok: false, error: "No rows provided" });
    }

    // Normalize & validate; collect skipped rows
    const normalized: IncomingRow[] = [];
    const skipped: { index: number; reason: string }[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const n = normalizeRow(incoming[i]);
      if (!n) {
        if (skipped.length < 25) skipped.push({ index: i, reason: "Missing required fields or invalid 'correct'" });
        continue;
      }
      normalized.push(n);
    }
    if (!normalized.length) {
      return res
        .status(400)
        .json({ ok: false, error: "No valid rows (need domain, question, a, b, c, d, correct=A/B/C/D)", received: incoming.length, skipped });
    }

    // Dedupe within this upload: (domain|subdomain|question|a|b|c|d|correct)
    const seen = new Set<string>();
    const unique = normalized.filter((r) => {
      const k = [r.domain, r.subdomain ?? "", r.question, r.a, r.b, r.c, r.d, r.correct].join("||");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Map to DB column names
    const payload = unique.map((r) => ({
      domain: r.domain,
      subdomain: r.subdomain,
      prompt: r.question, // stored as 'prompt' column
      choice_a: r.a,
      choice_b: r.b,
      choice_c: r.c,
      choice_d: r.d,
      correct_choice: r.correct,
      rationale: r.rationale,
    }));

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        received: incoming.length,
        valid: normalized.length,
        unique: payload.length,
        skipped,
      });
    }

    // Batch insert; keep going on batch errors
    let totalInserted = 0;
    const batchResults: { index: number; count: number }[] = [];
    const batchErrors: { index: number; error: string }[] = [];

    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const batch = payload.slice(i, i + BATCH_SIZE);
      const batchIndex = i / BATCH_SIZE;
      try {
        const count = await insertBatch(batch);
        totalInserted += count;
        batchResults.push({ index: batchIndex, count });
      } catch (e: any) {
        batchErrors.push({ index: batchIndex, error: e?.message || "Batch failed" });
        // continue with next batch
      }
    }

    const ok = batchErrors.length === 0;

    return res.status(ok ? 200 : 207).json({
      ok,
      inserted: totalInserted,
      batches: batchResults,
      batchErrors,
      received: incoming.length,
      valid: normalized.length,
      unique: payload.length,
      skipped,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
