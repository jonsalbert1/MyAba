import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function resolveTables(req: NextApiRequest): string[] {
  const envTable = process.env.FLASHCARDS_TABLE?.trim();
  if (envTable) return [envTable];
  const q = (req.query.table as string) || "";
  if (q) return [q];
  // Prefer "cards" first, then older "flashcards" table if present
  return ["cards", "flashcards"];
}

type Row = {
  id: string;
  term: string | null;
  definition: string | null;
  deck?: string | null;
  created_at?: string | null;
  domain?: string | null;
  subdomain?: string | null;
  class_code?: string | null;
  deck_number?: number | null;
};

function sErr(e: any): string {
  try {
    if (typeof e === "string") return e;
    if (e?.message) return String(e.message);
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    const deckRaw = (req.query.deck as string) ?? "";
    const deck = deckRaw.trim();

    const classRaw = (req.query.class_code as string) ?? "";
    const classFilter = classRaw.trim();

    const deckNumberRaw = (req.query.deck_number as string) ?? "";
    const deckNumberNum = Number(deckNumberRaw);
    const hasDeckNumberFilter =
      Number.isFinite(deckNumberNum) && deckNumberRaw.trim() !== "";

    const limit = Math.min(5000, Math.max(1, Number(req.query.limit) || 1000));
    const rawOffset = Number(req.query.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

    const tables = resolveTables(req);
    let lastErr: any = null;

    for (const table of tables) {
      const selectAttempts = [
        // Try with all the new columns first
        "id, term, definition, deck, domain, subdomain, class_code, deck_number, created_at",
        "id, term, definition, deck, domain, subdomain, created_at",
        "id, term, definition, deck, created_at",
        "id, term, definition",
      ];

      for (const sel of selectAttempts) {
        try {
          // Base query (no range yet)
          let q = supabase.from(table).select(sel, { count: "exact" });

          // Case-insensitive deck filter.
          if (deck) {
            const d = deck.toLowerCase();
            if (d === "global") {
              // include NULL + any case variant of "global"
              q = q.or(`deck.is.null,deck.ilike.${deck}`);
            } else {
              // exact-ish case-insensitive match (no wildcards)
              q = q.ilike("deck", deck);
            }
          }

          // Optional: filter by class_code if provided
          if (classFilter) {
            q = q.eq("class_code", classFilter);
          }

          // Optional: filter by deck_number if provided and valid
          if (hasDeckNumberFilter) {
            q = q.eq("deck_number", deckNumberNum);
          }

          // First get total count safely
          const { count, error: countErr } = await q.limit(1);
          if (countErr) throw countErr;
          const total = count ?? 0;

          // Out-of-range offset returns empty page (not 500)
          if (offset >= total) {
            return res.status(200).json({
              ok: true,
              table,
              count: total,
              cards: [] as Row[],
              limit,
              offset,
            });
          }

          // Now fetch page
          const start = offset;
          const end = Math.max(offset, offset + limit - 1);
          const { data, error } = await q.range(start, end);
          if (error) throw error;

          // ✅ Type-safe guard for build: cast via unknown first
          const rows: Row[] = Array.isArray(data) ? ((data as unknown) as Row[]) : [];

          return res.status(200).json({
            ok: true,
            table,
            count: total,
            cards: rows,
            limit,
            offset,
          });
        } catch (e: any) {
          const msg = sErr(e);
          // If the error is due to a missing column (e.g., class_code on older table),
          // fall through to the next selectAttempt / table.
          if (msg.includes("column") && msg.includes("does not exist")) {
            lastErr = e;
            continue; // try next select shape
          }
          lastErr = e;
        }
      }
    }

    return res.status(500).json({
      ok: false,
      error:
        sErr(lastErr) ||
        `No valid columns found (tried: ${resolveTables(req).join(", ")})`,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: sErr(e) || "Unexpected server error" });
  }
}
