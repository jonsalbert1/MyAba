// pages/api/safmeds/week.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type WeeklyRow = {
  run_date: string;        // "2025-11-18"
  best_correct: number;    // best correct for that day
  total_runs: number;      // how many runs that day
  avg_correct: number;     // average correct that day (rounded)
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Use GET" });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.error("safmeds/week getUser error", userErr);
    }

    if (!user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    // last 7 days (today + previous 6)
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 6);

    const fromISO = from.toISOString();

    const { data, error } = await supabase
      .from("safmeds_runs")
      .select(
        "created_at, cards_correct, cards_incorrect, duration_setting_seconds"
      )
      .eq("user_id", user.id)
      .gte("created_at", fromISO)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("safmeds/week select error", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to load SAFMEDS weekly summary",
      });
    }

    const byDate: Record<
      string,
      { best: number; totalRuns: number; sumCorrect: number }
    > = {};

    for (const row of data ?? []) {
      const createdAt = row.created_at as string;
      if (!createdAt) continue;

      const d = new Date(createdAt);
      const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD

      const correct = Number(row.cards_correct ?? 0);

      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          best: correct,
          totalRuns: 1,
          sumCorrect: correct,
        };
      } else {
        byDate[dateKey].best = Math.max(byDate[dateKey].best, correct);
        byDate[dateKey].totalRuns += 1;
        byDate[dateKey].sumCorrect += correct;
      }
    }

    const rows: WeeklyRow[] = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([dateKey, agg]) => ({
        run_date: dateKey,
        best_correct: agg.best,
        total_runs: agg.totalRuns,
        avg_correct: Math.round(agg.sumCorrect / agg.totalRuns),
      }));

    return res.status(200).json({ ok: true, rows });
  } catch (err: any) {
    console.error("safmeds/week exception", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
}
