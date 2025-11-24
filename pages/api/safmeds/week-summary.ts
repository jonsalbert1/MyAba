// pages/api/safmeds/week-summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function sErr(e: any): string {
  try {
    if (typeof e === "string") return e;
    if (e?.message) return String(e.message);
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      return res.status(500).json({ ok: false, error: sErr(userErr) });
    }
    if (!user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    // Start of week (Monday)
    const now = new Date();
    const day = now.getDay(); // 0=Sun,1=Mon,...
    const diffToMonday = (day + 6) % 7; // 0 if Monday
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - diffToMonday
    );
    startOfWeek.setHours(0, 0, 0, 0);

    // ✅ Only select columns that actually exist in safmeds_runs
    const { data, error } = await supabase
      .from("safmeds_runs")
      .select(
        `
          id,
          correct,
          incorrect,
          deck,
          created_at
        `
      )
      .eq("user_id", user.id)
      .gte("created_at", startOfWeek.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ ok: false, error: sErr(error) });
    }

    const runs = Array.isArray(data) ? data : [];

    if (!runs.length) {
      return res.status(200).json({
        ok: true,
        summary: {
          total_runs: 0,
          total_correct: 0,
          total_incorrect: 0,
          total_cards: 0,
          days_practiced: 0,
          decks_count: 0,
          first_run: null,
          last_run: null,
        },
      });
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const daySet = new Set<string>();
    const deckSet = new Set<string>();

    for (const r of runs as any[]) {
      const c = Number(r.correct ?? 0);
      const i = Number(r.incorrect ?? 0);
      totalCorrect += Number.isFinite(c) ? c : 0;
      totalIncorrect += Number.isFinite(i) ? i : 0;

      if (r.created_at) {
        const d = new Date(r.created_at);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        daySet.add(key);
      }
      if (r.deck) {
        deckSet.add(String(r.deck));
      }
    }

    const totalCards = totalCorrect + totalIncorrect;
    const firstRun = runs[0]?.created_at ?? null;
    const lastRun = runs[runs.length - 1]?.created_at ?? null;

    const summary = {
      total_runs: runs.length,
      total_correct: totalCorrect,
      total_incorrect: totalIncorrect,
      total_cards: totalCards,
      days_practiced: daySet.size,
      decks_count: deckSet.size,
      first_run: firstRun,
      last_run: lastRun,
    };

    return res.status(200).json({ ok: true, summary });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: sErr(e) });
  }
}
