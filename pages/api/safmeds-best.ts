import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/safmeds-best
 * Query params:
 *   user_id=<uuid-or-email>   (optional but recommended)
 *   start=YYYY-MM-DD          (optional; local_day >= start)
 *   end=YYYY-MM-DD            (optional; local_day <= end)
 *   deck=GLOBAL | ALL | <name> (optional; default GLOBAL; ALL disables deck filter)
 *
 * Returns: [{ timestampISO, correct, incorrect }]
 *   - timestampISO comes from run_started_at (ISO string)
 *   - correct/incorrect are the best-of-day values from the view
 *
 * Notes:
 *   - Assumes view v_safmeds_best_of_day has columns:
 *     user_id?, user_email?, deck, correct, incorrect,
 *     duration_seconds, run_started_at, local_day, net_score
 *   - If you only have user_id (no user_email) or vice-versa,
 *     the .eq() that doesn't match a column will be ignored.
 */
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const userParam = String(req.query.user_id ?? "").trim();
    const start = String(req.query.start ?? "").trim(); // YYYY-MM-DD
    const end   = String(req.query.end ?? "").trim();   // YYYY-MM-DD
    const deckParam = String(req.query.deck ?? "GLOBAL").trim();
    const allDecks = deckParam.toUpperCase() === "ALL";

    // Base select
    let query = supabase
      .from("v_safmeds_best_of_day")
      .select(
        // include both user_id and user_email if present in the view
        "user_id, user_email, deck, correct, incorrect, duration_seconds, run_started_at, local_day, net_score"
      )
      .order("local_day", { ascending: true });

    // Optional filters
    if (!allDecks && deckParam) query = query.eq("deck", deckParam);

    if (userParam) {
      if (userParam.includes("@")) {
        // If your view exposes user_email, this will work; if not, it's a no-op
        // (Supabase will throw if the column doesn't exist; catch below)
        query = query.eq("user_email", userParam);
      } else {
        query = query.eq("user_id", userParam);
      }
    }

    if (start) query = query.gte("local_day", start);
    if (end)   query = query.lte("local_day", end);

    // Reasonable safety cap (one month)
    query = query.limit(62);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Map to the lightweight shape the frontend expects
    const rows =
      (data ?? []).map((r: any) => ({
        timestampISO: r.run_started_at,          // ISO string
        correct: Number(r.correct ?? 0),
        incorrect: Number(r.incorrect ?? 0),
      })) ?? [];

    res.status(200).json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "SAFMEDS best-of-day error" });
  }
}
