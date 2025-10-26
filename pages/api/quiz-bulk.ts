// pages/api/quiz-bulk.ts
/** Allow larger uploads (tweak if needed) */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Fail fast if env is missing */
function ensureEnv() {
  if (!baseUrl) throw new Error("SUPABASE_URL missing");
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
}

/** Types for incoming CSV -> API payload */
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

/** Small helpers for text cleaning */
function stripBOM(s: string) {
  if (!s) return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
function cleanText(x: unknown): string {
  const s = stripBOM(String(x ?? "")).trim();
  return s.normalize?.("NFC") ?? s;
}
function nullIfEmpty(s: string | null | undefined) {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

/** Normalize a raw row to a validated IncomingRow (or null if invalid) */
function normalizeRow(r: any): IncomingRow | null {
  const domain = cleanText(r.domain);
  const subdomain = nullIfEmpty(cleanText(r.subdomain));
  // accept question or prompt
  const question = cleanText(r.question ?? r.prompt);
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

/** POST to Supabase PostgREST */
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

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Supabase REST ${resp.status} ${resp.statusText}: ${text}`);
  }
  let inserted: any[] = [];
  try {
    inserted = JSON.parse(text);
  } catch {
    // If PostgREST returns non-JSON (unlikely with Prefer=representation), still guard
    inserted = [];
  }
  return inserted.length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    ensureEnv();

    const dryRun = String(req.query.dryRun ?? "").trim() === "1";
    const incoming = Array.isArray(req.body) ? req.body : [];
    if (!incoming.length) {
      return res.status(400).json({ ok: false, error: "No rows provided" });
    }

    // Normalize & validate
    const normalized: IncomingRow[] = [];
    for (const r of incoming) {
      const n = normalizeRow(r);
      if (n) normalized.push(n);
    }
    if (!normalized.length) {
      return res.status(400).json({
        ok: false,
        error: "No valid rows (need domain, question, a, b, c, d, correct=A/B/C/D)",
      });
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
      prompt: r.question, // DB column name
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
      });
    }

    // Insert in one go; client already chunks if needed
    const count = await insertBatch(payload);

    return res.status(200).json({
      ok: true,
      inserted: count,
      received: incoming.length,
      valid: normalized.length,
      unique: payload.length,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

