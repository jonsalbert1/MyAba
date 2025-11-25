// pages/api/flashcards/meta.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DeckMeta = {
  class_code: string;
  deck_number: number;
};

type Card = {
  id: string;
  term: string;
  definition: string;
  class_code: string;
  deck_number: number;
};

type MetaResponse =
  | {
      ok: true;
      mode: "decks";
      decks: DeckMeta[];
    }
  | {
      ok: true;
      mode: "cards";
      data: Card[];
    }
  | {
      ok: false;
      error: string;
    };

const TABLE = "cards";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MetaResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { class_code, deck_number } = req.query;

    // -------------------------------------------------------------------
    // 1) If class_code + deck_number are provided → return CARDS mode
    // -------------------------------------------------------------------
    if (class_code && deck_number) {
      const cc = String(class_code);
      const dn = Number(deck_number);

      console.log("flashcards/meta cards mode", { cc, dn });

      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select(
          "id, term, definition, class_code, deck_number"
        )
        .eq("class_code", cc)
        .eq("deck_number", dn)
        .order("term", { ascending: true });

      if (error) {
        console.error("cards query error", error);
        return res
          .status(500)
          .json({ ok: false, error: error.message ?? "Error loading cards" });
      }

      return res.status(200).json({
        ok: true,
        mode: "cards",
        data: (data ?? []) as Card[],
      });
    }

    // -------------------------------------------------------------------
    // 2) Otherwise → return DECKS mode (distinct class_code/deck_number)
    // -------------------------------------------------------------------
    console.log("flashcards/meta decks mode");

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("class_code, deck_number")
      .not("class_code", "is", null)
      .not("deck_number", "is", null)
      .order("class_code", { ascending: true })
      .order("deck_number", { ascending: true });

    if (error) {
      console.error("decks query error", error);
      return res
        .status(500)
        .json({ ok: false, error: error.message ?? "Error loading decks" });
    }

    const rows = (data ?? []) as { class_code: string; deck_number: number }[];

    // JS-side dedupe of (class_code, deck_number)
    const seen = new Set<string>();
    const decks: DeckMeta[] = [];
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
    console.error("flashcards/meta unexpected error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message ?? "Unexpected server error",
    });
  }
}
