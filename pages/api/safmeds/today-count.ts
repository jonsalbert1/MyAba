// pages/api/safmeds/today-count.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Summary = {
  runs: number;
  correct: number;
  incorrect: number;
};

type ApiResponse =
  | { ok: true; today: Summary }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method Not Allowed" });
  }

  const { user_id } = req.query;

  if (!user_id || typeof user_id !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "Missing user_id" });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();

    const { data, error } = await supabaseAdmin
      .from("safmeds_runs")
      .select("correct, incorrect, created_at")
      .eq("user_id", user_id)
      .gte("created_at", startOfToday);

    if (error) {
      console.error("today-count error:", error);
      return res
        .status(500)
        .json({ ok: false, error: error.message });
    }

    const summary: Summary = {
      runs: 0,
      correct: 0,
      incorrect: 0,
    };

    for (const row of data ?? []) {
      summary.runs += 1;
      summary.correct += row.correct ?? 0;
      summary.incorrect += row.incorrect ?? 0;
    }

    return res.status(200).json({ ok: true, today: summary });
  } catch (e: any) {
    console.error("today-count exception:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Unknown error" });
  }
}
