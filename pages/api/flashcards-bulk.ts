// pages/api/flashcards-bulk.ts
const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GLOBAL_DECK = process.env.GLOBAL_DECK_ID || "GLOBAL";

// PostgREST insert batch size
const BATCH_SIZE = 500;

type Row = {
  term: string;
  definition: string;
  domain?: string | null;
  deck?: string | null;
};

function ensureEnv() {
  if (!baseUrl) throw new Error("SUPABASE_URL missing");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
}

/* ---------- text cleanup / safety nets ---------- */
function stripBOM(s: string) {
  if (!s) return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function repairMojibake(s: string) {
  // fix common UTF-8-as-CP1252 sequences seen in CSVs
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

function normalizeRow(r: any, defaultDeck: string): Row | null {
  const term = cleanText(r.term);
  const definition = cleanText(r.definition);
  if (!term || !definition) return null;

  const domain = nullIfEmpty(cleanText(r.domain));
  const deck = nullIfEmpty(cleanText(r.deck)) ?? defaultDeck;

  return { term, definition, domain, deck };
}

async function insertBatch(batch: Row[]) {
  const resp = await fetch(`${baseUrl}/rest/v1/study_cards`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
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

    // Optional per-request overrides
    const defaultDeck = (String(req.query.defaultDeck ?? "").trim()) || GLOBAL_DECK;
    const dryRun = String(req.query.dryRun ?? "") === "1";

    const incoming = Array.isArray(req.body) ? req.body : [];
    if (!incoming.length) {
      return res.status(400).json({ ok: false, error: "No rows provided" });
    }

    // Normalize & validate rows, collect skips
    const normalized: Row[] = [];
    const skipped: { index: number; reason: string }[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const n = normalizeRow(incoming[i], defaultDeck);
      if (!n) {
        if (skipped.length < 25) skipped.push({ index: i, reason: "Missing term or definition" });
        continue;
      }
      normalized.push(n);
    }
    if (!normalized.length) {
      return res.status(400).json({
        ok: false,
        error: "No valid rows (need term & definition)",
        received: incoming.length,
        skipped,
      });
    }

    // In-upload dedupe (term+definition+deck+domain)
    const seen = new Set<string>();
    const unique: Row[] = [];
    for (const r of normalized) {
      const k = `${r.term}||${r.definition}||${r.deck ?? ""}||${r.domain ?? ""}`;
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(r);
      }
    }

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        received: incoming.length,
        valid: normalized.length,
        unique: unique.length,
        defaultDeckUsed: defaultDeck,
        skipped,
      });
    }

    // Batch insert; keep going on batch errors
    let totalInserted = 0;
    const batchResults: { index: number; count: number }[] = [];
    const batchErrors: { index: number; error: string }[] = [];

    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      const batchIndex = i / BATCH_SIZE;
      try {
        const count = await insertBatch(batch);
        totalInserted += count;
        batchResults.push({ index: batchIndex, count });
      } catch (e: any) {
        batchErrors.push({ index: batchIndex, error: e?.message || "Batch failed" });
        // continue to next batch
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
      unique: unique.length,
      defaultDeckUsed: defaultDeck,
      skipped,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

