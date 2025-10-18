import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase, json } from "./_supabaseAdmin";

/**
 * GET /api/safmeds-best?deck=GLOBAL
 * Returns one best run per local day from the view v_safmeds_best_of_day.
 * Pass deck=ALL to skip deck filtering.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed", data: [] });
    }

    const deckParam = String(req.query.deck ?? "GLOBAL");
    const all = deckParam.toUpperCase() === "ALL";

    let query = supabase
      .from("v_safmeds_best_of_day")
      .select("id, deck, correct, incorrect, duration_seconds, run_started_at, local_day, net_score")
      .order("local_day", { ascending: true });

    if (!all) query = query.eq("deck", deckParam);

    const { data, error } = await query;
    if (error) return json(res, 500, { ok: false, error: error.message, data: [] });

    return json(res, 200, { ok: true, data: data ?? [] });
  } catch (e: any) {
    return json(res, 500, { ok: false, error: e.message || "SAFMEDS best-of-day error", data: [] });
  }
}
