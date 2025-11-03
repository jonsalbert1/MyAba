import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    const { user_id, deck, correct, incorrect, duration_seconds, run_started_at } = req.body ?? {};

    if (!user_id) return res.status(400).json({ ok: false, error: "Missing user_id" });
    if (typeof correct !== "number" || typeof incorrect !== "number" || typeof duration_seconds !== "number") {
      return res.status(400).json({ ok: false, error: "Missing or invalid numeric fields" });
    }

    const payload = {
      user_id,
      deck: deck ?? "GLOBAL",
      correct,
      incorrect,
      duration_seconds,
      run_started_at: run_started_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase.from("safmeds_runs").insert(payload).select("*").single();
    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
