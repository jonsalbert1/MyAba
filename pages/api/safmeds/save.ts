// pages/api/safmeds/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  user_id: string;
  correct: number;
  incorrect: number;
  duration_seconds?: number | null;
  deck?: string | null;
  notes?: string | null;
  local_day: string; // "YYYY-MM-DD" from client
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const {
      user_id,
      correct,
      incorrect,
      duration_seconds,
      deck,
      notes,
      local_day,
    } = req.body as Body;

    if (!user_id || !local_day) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing user_id or local_day" });
    }

    const c = Number(correct);
    const ic = Number(incorrect);

    if (!Number.isFinite(c) || !Number.isFinite(ic) || c < 0 || ic < 0) {
      return res
        .status(400)
        .json({ ok: false, error: "correct/incorrect must be >= 0 numbers" });
    }

    const net_score = c - ic;

    // Check how many runs already exist for this user + local_day
    const { count, error: countErr } = await supabaseAdmin
      .from("safmeds_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("local_day", local_day);

    if (countErr) {
      console.error(countErr);
      return res
        .status(500)
        .json({ ok: false, error: "Error counting existing runs" });
    }

    if ((count ?? 0) >= 5) {
      return res
        .status(400)
        .json({ ok: false, error: "Daily limit of 5 SAFMEDS runs reached" });
    }

    // 🔧 DO NOT send local_ts – let Postgres handle its default / generated value
    const { data, error: insertErr } = await supabaseAdmin
      .from("safmeds_runs")
      .insert([
        {
          user_id,
          correct: c,
          incorrect: ic,
          net_score,
          local_day, // date column
          duration_seconds: duration_seconds ?? null,
          deck: deck ?? null,
          notes: notes ?? null,
        },
      ])
      .select();

    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ ok: false, error: insertErr.message });
    }

    return res.status(200).json({ ok: true, data: data?.[0] ?? null });
  } catch (e: any) {
    console.error(e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Unknown server error" });
  }
}
