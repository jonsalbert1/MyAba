// pages/api/safmeds-week.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

type Row = {
  user_id: string;
  deck: string | null;
  correct: number;
  incorrect: number;
  duration_seconds: number;
  run_started_at: string; // ISO
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ ok: false, error: "Method not allowed", data: [] });
      return;
    }
    const start = String(req.query.start ?? "");
    const end   = String(req.query.end ?? "");
    const user  = String(req.query.user_id ?? "");
    const deck  = String(req.query.deck ?? "ALL");

    if (!start || !end || !user) {
      res.status(400).json({ ok: false, error: "start, end, user_id are required", data: [] });
      return;
    }

    let q = supabase
      .from("safmeds_runs")
      .select("user_id, deck, correct, incorrect, duration_seconds, run_started_at")
      .eq("user_id", user)
      .gte("run_started_at", `${start}T00:00:00.000Z`)
      .lte("run_started_at", `${end}T23:59:59.999Z`)
      .order("run_started_at", { ascending: true });

    if (deck && deck !== "ALL") q = q.eq("deck", deck);

    const { data, error } = await q;
    if (error) return res.status(500).json({ ok: false, error: error.message, data: [] });

    res.status(200).json({ ok: true, data: (data as Row[]) ?? [] });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "Fetch error", data: [] });
  }
}
