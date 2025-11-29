// pages/api/safmeds/run.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type ApiResponse =
  | { ok: true; run: any }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, run: null });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ ok: false, error: "Missing body" });
    }

    // 1️⃣ Get logged-in user from Supabase auth
    const supabaseUserClient = createPagesServerClient({ req, res });
    const {
      data: { user },
    } = await supabaseUserClient.auth.getUser();

    const authUserId = user?.id ?? null;

    // 2️⃣ Normalize user_id
    const body = req.body as any;
    const bodyUserId =
      body.user_id ?? body.userId ?? body.uid ?? null;

    const finalUserId = bodyUserId ?? authUserId;

    if (!finalUserId) {
      return res
        .status(401)
        .json({ ok: false, error: "No user_id; user is not authenticated" });
    }

    // 3️⃣ Build a payload that matches your schema (do NOT send local_ts – it's generated)
    const nowIso = new Date().toISOString();

    const payload = {
      user_id: finalUserId,
      deck: body.deck ?? null,
      correct: Number.isFinite(Number(body.correct)) ? Number(body.correct) : 0,
      incorrect: Number.isFinite(Number(body.incorrect)) ? Number(body.incorrect) : 0,
      duration_seconds:
        typeof body.duration_seconds === "number"
          ? body.duration_seconds
          : null,
      run_started_at: body.run_started_at || nowIso,
      run_ended_at: body.run_ended_at ?? null,
      notes: body.notes ?? null,
      class_id: body.class_id ?? null,
      deck_number:
        typeof body.deck_number === "number"
          ? body.deck_number
          : (typeof body.deck_number === "string"
              ? Number(body.deck_number) || null
              : null),
      class_code: body.class_code ?? null,
      mode: body.mode ?? null,
      // ❌ Do NOT include: id, local_ts (generated), local_day, net_score, created_at
    };

    // 4️⃣ Insert into safmeds_runs
    const { data, error } = await supabaseAdmin
      .from("safmeds_runs")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("safmeds/run insert error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, run: data });
  } catch (e: any) {
    console.error("safmeds/run exception:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Unknown server error" });
  }
}
