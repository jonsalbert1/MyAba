// pages/api/flashcards/meta.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DeckEntry = {
  class_code: string;
  deck_number: number;
};

type ApiResponse =
  | { ok: true; mode: "cards"; data: any[] }
  | { ok: true; mode: "decks"; decks: DeckEntry[] }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const { class_code, deck_number } = req.query;

    // ─────────────────────────────
    // MODE 1: specific deck → return CARDS
    // ─────────────────────────────
    if (class_code !== undefined && deck_number !== undefined) {
      const cc = String(class_code);
      const dn = Number(deck_number);

      if (!cc || cc === "undefined" || Number.isNaN(dn)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid class_code (${cc}) or deck_number (${deck_number})`,
        });
      }

      console.log("flashcards/meta cards mode", { cc, dn });

      const { data, error } = await supabaseAdmin
        .from("cards")
        .select("id, term, definition, class_code, deck_number")
        .eq("class_code", cc)
        .eq("deck_number", dn)
        .order("id", { ascending: true });

      if (error) {
        console.error("flashcards/meta (cards) error:", error);
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({
        ok: true,
        mode: "cards",
        data: data ?? [],
      });
    }

    // ─────────────────────────────
    // MODE 2: no params → return unique DECK LIST
    // ─────────────────────────────
    const { data, error } = await supabaseAdmin
      .from("cards")
      .select("class_code, deck_number")
      .order("class_code", { ascending: true })
      .order("deck_number", { ascending: true });

    if (error) {
      console.error("flashcards/meta (decks) error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    type Row = {
      class_code: string | null;
      deck_number: number | null;
    };

    const rows = (data ?? []) as Row[];

    const seen = new Set<string>();
    const decks: DeckEntry[] = [];

    for (const row of rows) {
      if (!row.class_code || row.deck_number == null) continue;

      const key = `${row.class_code}::${row.deck_number}`;
      if (seen.has(key)) continue;
      seen.add(key);

      decks.push({
        class_code: row.class_code,
        deck_number: row.deck_number,
      });
    }

    return res.status(200).json({
      ok: true,
      mode: "decks",
      decks,
    });
  } catch (e: any) {
    console.error("flashcards/meta exception:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Unknown error" });
  }
}
