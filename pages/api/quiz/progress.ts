// pages/api/quiz/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type Body = {
  // new names
  domain?: string;
  subdomain?: string;
  lastAccuracy?: number;
  totalCorrect?: number;
  totalAnswered?: number;
  completed?: boolean;

  // older names we used earlier (for safety)
  domain_letter?: string;
  subdomain_code?: string;
  accuracy_percent?: number;
  correct_count?: number;
  answered_count?: number;
  is_completed?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    // 🔐 Always trust Supabase auth, not body.user_id
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.error("quiz/progress getUser error", userErr);
    }

    if (!user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const body = req.body as Body;

    // 🔎 Normalize fields from whatever shape the client sends
    const rawDomain =
      (body.domain ??
        body.domain_letter ??
        "").toString().trim().toUpperCase();

    const rawSubdomain =
      (body.subdomain ??
        body.subdomain_code ??
        "").toString().trim().toUpperCase();

    const rawAccuracy =
      typeof body.lastAccuracy === "number"
        ? body.lastAccuracy
        : typeof body.accuracy_percent === "number"
        ? body.accuracy_percent
        : 0;

    const rawAnswered =
      typeof body.totalAnswered === "number"
        ? body.totalAnswered
        : typeof body.answered_count === "number"
        ? body.answered_count
        : 0;

    const rawCorrect =
      typeof body.totalCorrect === "number"
        ? body.totalCorrect
        : typeof body.correct_count === "number"
        ? body.correct_count
        : 0;

    const completed =
      typeof body.completed === "boolean"
        ? body.completed
        : !!body.is_completed;

    const accuracy = Math.max(0, Math.min(100, Number(rawAccuracy) || 0));
    const answered = Math.max(0, Number(rawAnswered) || 0);
    const correct = Math.max(0, Number(rawCorrect) || 0);

    if (!rawDomain || !rawSubdomain) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing domain or subdomain" });
    }

    const now = new Date().toISOString();

    // 🔄 Read existing row (if any)
    const { data: existing, error: selErr } = await supabase
      .from("quiz_subdomain_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("domain", rawDomain)
      .eq("subdomain", rawSubdomain)
      .maybeSingle();

    if (selErr && selErr.code !== "PGRST116") {
      // PGRST116 = row not found; ignore
      console.error("quiz/progress select error", selErr);
    }

    if (existing) {
      // ===== UPDATE path =====
      const attempts = (existing.attempts ?? 0) + 1;

      const total_answered =
        (existing.total_answered ?? 0) + (answered > 0 ? answered : 0);
      const total_correct =
        (existing.total_correct ?? 0) + (correct > 0 ? correct : 0);

      const best_accuracy_percent =
        typeof existing.best_accuracy_percent === "number"
          ? Math.max(existing.best_accuracy_percent, accuracy)
          : accuracy;

      const updatePayload: any = {
        last_accuracy: accuracy,
        answered_count: answered,
        correct_count: correct,
        attempts,
        total_answered,
        total_correct,
        best_accuracy_percent,
        last_attempt_at: now,
        is_completed: completed,
      };

      // ⚠️ IMPORTANT: never send last_completed_at: null
      // Only update it when this run is considered "completed"
      if (completed) {
        updatePayload.last_completed_at = now;
      }

      const { error: updErr } = await supabase
        .from("quiz_subdomain_progress")
        .update(updatePayload)
        .eq("user_id", user.id)
        .eq("domain", rawDomain)
        .eq("subdomain", rawSubdomain);

      if (updErr) {
        console.error("quiz/progress update error", updErr);
        return res
          .status(500)
          .json({ ok: false, error: "Failed to update progress" });
      }

      return res.status(200).json({
        ok: true,
        mode: "update",
        best_accuracy_percent,
      });
    } else {
      // ===== INSERT path =====
      const attempts = 1;
      const total_answered = answered;
      const total_correct = correct;
      const best_accuracy_percent = accuracy;

      const insertPayload: any = {
        user_id: user.id,
        domain: rawDomain,
        subdomain: rawSubdomain,
        last_accuracy: accuracy,
        answered_count: answered,
        correct_count: correct,
        attempts,
        total_answered,
        total_correct,
        best_accuracy_percent,
        last_attempt_at: now,
        is_completed: completed,
        // 👇 DO NOT send last_completed_at here so Postgres uses the DEFAULT
        // last_completed_at: <omit>,
      };

      const { error: insErr } = await supabase
        .from("quiz_subdomain_progress")
        .insert(insertPayload);

      if (insErr) {
        console.error("quiz/progress insert error", insErr);
        return res
          .status(500)
          .json({ ok: false, error: "Failed to insert progress" });
      }

      return res.status(200).json({
        ok: true,
        mode: "insert",
        best_accuracy_percent,
      });
    }
  } catch (err: any) {
    console.error("quiz/progress exception", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
}
