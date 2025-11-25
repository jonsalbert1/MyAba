// pages/api/safmeds/run.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ApiResponse =
  | { ok: true }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = req.body ?? {};
    const {
      user_id,
      correct,
      incorrect,
      duration_s, // 30 or 60 from trials.tsx
      deck,
      notes,
    } = body;

    if (!user_id) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing user_id" });
    }

    const safeCorrect = typeof correct === "number" ? correct : 0;
    const safeIncorrect = typeof incorrect === "number" ? incorrect : 0;
    const safeDuration =
      typeof duration_s === "number" && duration_s > 0 ? duration_s : 60;

    const { error } = await supabaseAdmin
      .from("safmeds_runs")
      .insert([
        {
          user_id,
          correct: safeCorrect,
          incorrect: safeIncorrect,
          // ⛔ do NOT send net_score – it's a generated column in Postgres
          duration_seconds: safeDuration, // NOT NULL column
          deck: deck ?? null,
          notes: notes ?? null,
          // local_day / local_ts / created_at handled by defaults/triggers
        },
      ]);

    if (error) {
      console.error("safmeds/run insert error:", error);
      return res
        .status(500)
        .json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("safmeds/run exception:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message ?? "Unknown error",
    });
  }
}
