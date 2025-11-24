import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

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

    // We’ll query only the primary table "cards" for meta.
    // If you REALLY want to support "flashcards" fallback too, we can extend this later.
    const table = "cards";

    // Distinct class_code
    const { data: classRows, error: classErr } = await supabase
      .from(table)
      .select("class_code", { distinct: true })
      .not("class_code", "is", null)
      .order("class_code", { ascending: true });

    if (classErr) throw classErr;

    // Distinct deck
    const { data: deckRows, error: deckErr } = await supabase
      .from(table)
      .select("deck", { distinct: true })
      .not("deck", "is", null)
      .order("deck", { ascending: true });

    if (deckErr) throw deckErr;

    // Distinct deck_number
    const { data: deckNumRows, error: deckNumErr } = await supabase
      .from(table)
      .select("deck_number", { distinct: true })
      .not("deck_number", "is", null)
      .order("deck_number", { ascending: true });

    if (deckNumErr) throw deckNumErr;

    const class_codes = (classRows ?? [])
      .map((r: any) => r.class_code as string)
      .filter((x) => !!x);

    const decks = (deckRows ?? [])
      .map((r: any) => r.deck as string)
      .filter((x) => !!x);

    const deck_numbers = (deckNumRows ?? [])
      .map((r: any) => r.deck_number as number)
      .filter((x) => typeof x === "number");

    return res.status(200).json({
      ok: true,
      class_codes,
      decks,
      deck_numbers,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: sErr(e) || "Unexpected server error" });
  }
}
