// pages/api/safmeds/week.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WeekSummary = {
  runs: number;
  correct: number;
  incorrect: number;
};

type SafmedsRunRow = {
  id: string;
  user_id: string;
  local_day?: string | null;
  local_ts?: string | null;
  correct: number | null;
  incorrect: number | null;
  net_score?: number | null;
  duration_seconds?: number | null;
  deck?: string | null;
  notes?: string | null;
  created_at: string;
};

type ApiResponse =
  | { ok: true; week: WeekSummary | null; runs: SafmedsRunRow[] }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const userId = (req.query.user_id as string | undefined)?.trim();
  if (!userId) {
    return res.status(400).json({ ok: false, error: "Missing user_id" });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Pull recent runs for this user and then filter to last 7 days in code
    const { data, error } = await supabaseAdmin
      .from("safmeds_runs")
      .select(
        "id,user_id,local_day,local_ts,correct,incorrect,net_score,duration_seconds,deck,notes,created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("week supabase error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const allRuns = (data ?? []) as SafmedsRunRow[];

    const runs = allRuns.filter((row) => {
      const d = new Date(row.created_at);
      return d >= sevenDaysAgo && d <= now;
    });

    if (!runs.length) {
      return res.status(200).json({ ok: true, week: null, runs: [] });
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    runs.forEach((r) => {
      totalCorrect += r.correct ?? 0;
      totalIncorrect += r.incorrect ?? 0;
    });

    const weekSummary: WeekSummary = {
      runs: runs.length,
      correct: totalCorrect,
      incorrect: totalIncorrect,
    };

    return res.status(200).json({ ok: true, week: weekSummary, runs });
  } catch (e: any) {
    console.error("week handler exception:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Unknown server error" });
  }
}
