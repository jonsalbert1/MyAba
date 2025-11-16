// pages/api/safmeds/run.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    // 🔐 Make sure we have an authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("SAFMEDS getUser error", userError);
      return res.status(401).json({ ok: false, error: "Auth error fetching user." });
    }

    if (!user) {
      return res.status(401).json({ ok: false, error: "You must be signed in." });
    }

    const body = req.body ?? {};
    const deck = body.deck ?? null;
    const durationSeconds = Number(body.duration_seconds) || 0;
    const correct = Number(body.correct) || 0;
    const incorrect = Number(body.incorrect) || 0;
    const runStartedAt = body.run_started_at
      ? new Date(body.run_started_at).toISOString()
      : new Date().toISOString();

    // 🧠 Build insert payload using ONLY columns that actually exist.
    // Assumes safmeds_runs has: user_id, deck, correct, incorrect, duration_seconds, run_started_at
    const insertPayload: any = {
      user_id: user.id,
      deck,
      correct,
      incorrect,
      duration_seconds: durationSeconds,
      run_started_at: runStartedAt,
    };

    const { error: insertError } = await supabase
      .from("safmeds_runs")
      .insert(insertPayload);

    if (insertError) {
      console.error("SAFMEDS insert error", insertError);
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("SAFMEDS run handler exception", e);
    return res.status(500).json({ ok: false, error: e?.message || "Unexpected error" });
  }
}
