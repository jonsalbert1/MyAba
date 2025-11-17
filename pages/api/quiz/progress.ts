// pages/api/quiz/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type Body = {
  domain_letter?: string;
  subdomain_code?: string;
  accuracy_percent?: number;
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

    // 🔐 Get current user from Supabase cookie
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

    const rawDomain = (body.domain_letter ?? "").toString().toUpperCase();
    const rawCode = (body.subdomain_code ?? "").toString().toUpperCase();
    const acc = Number(body.accuracy_percent ?? 0);

    // Basic validation
    if (!rawDomain || !rawCode || Number.isNaN(acc)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid fields" });
    }

    if (acc < 0 || acc > 100) {
      return res
        .status(400)
        .json({ ok: false, error: "accuracy_percent must be 0–100" });
    }

    // Optional: ensure the code starts with the domain letter
    if (!rawCode.startsWith(rawDomain)) {
      console.warn(
        "quiz/progress mismatch domain/code",
        rawDomain,
        rawCode
      );
    }

    const now = new Date().toISOString();

    // 🔄 Read existing row (if any)
    const { data: existing, error: selErr } = await supabase
      .from("quiz_subdomain_progress")
      .select("best_accuracy_percent")
      .eq("user_id", user.id)
      .eq("subdomain_code", rawCode)
      .maybeSingle();

    if (selErr && selErr.code !== "PGRST116") {
      // PGRST116 = row not found; ignore
      console.error("quiz/progress select error", selErr);
    }

    const previousBest =
      existing && typeof existing.best_accuracy_percent === "number"
        ? existing.best_accuracy_percent
        : null;

    const bestAccuracy =
      previousBest == null ? acc : Math.max(previousBest, acc);

    if (existing) {
      // 🔁 Update existing record
      const { error: updErr } = await supabase
        .from("quiz_subdomain_progress")
        .update({
          best_accuracy_percent: bestAccuracy,
          last_attempt_at: now,
        })
        .eq("user_id", user.id)
        .eq("subdomain_code", rawCode);

      if (updErr) {
        console.error("quiz/progress update error", updErr);
        return res
          .status(500)
          .json({ ok: false, error: "Failed to update progress" });
      }
    } else {
      // ➕ Insert new record
      const { error: insErr } = await supabase
        .from("quiz_subdomain_progress")
        .insert({
          user_id: user.id,
          domain_letter: rawDomain,
          subdomain_code: rawCode,
          best_accuracy_percent: bestAccuracy,
          last_attempt_at: now,
        });

      if (insErr) {
        console.error("quiz/progress insert error", insErr);
        return res
          .status(500)
          .json({ ok: false, error: "Failed to insert progress" });
      }
    }

    return res.status(200).json({ ok: true, best_accuracy: bestAccuracy });
  } catch (err: any) {
    console.error("quiz/progress exception", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
}
