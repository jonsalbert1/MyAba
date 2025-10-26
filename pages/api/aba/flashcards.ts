// pages/api/aba/flashcards.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const deckId = (process.env.GLOBAL_DECK_ID || "").trim();

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    if (req.method === "GET") {
      // Optional: ?all=1 returns everything, ignoring deck_id
      const showAll = req.query.all === "1";

      let q = supabase.from("flashcards").select("*").order("id", { ascending: true });

      if (!showAll && deckId && isUuid(deckId)) {
        q = q.eq("deck_id", deckId);
      }

      const { data, error } = await q;
      if (error) return res.status(200).json({ ok: false, stage: "select", error: error.message, deckId, filtered: !showAll && isUuid(deckId) });

      return res.status(200).json({
        ok: true,
        filtered: !showAll && isUuid(deckId),
        deckId: isUuid(deckId) ? deckId : null,
        count: Array.isArray(data) ? data.length : 0,
        data,
      });
    }

    if (req.method === "POST") {
      const body = req.body as Array<{ term: string; def: string; deck_id?: string }>;
      if (!Array.isArray(body)) return res.status(400).json({ ok: false, error: "Expected array of {term,def}" });

      // If GLOBAL_DECK_ID is a UUID, apply it; otherwise insert as-is (assumes caller sets deck_id)
      const rows = body.map(r => ({
        term: r.term,
        def: r.def,
        deck_id: isUuid(deckId) ? deckId : r.deck_id, // avoid invalid UUID inserts
      }));

      const { error } = await supabase.from("flashcards").insert(rows);
      if (error) return res.status(200).json({ ok: false, stage: "insert", error: error.message });

      return res.status(201).json({ ok: true, inserted: rows.length });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(200).json({ ok: false, stage: "catch", error: e?.message || "Unknown error" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
