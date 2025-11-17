// pages/api/quiz/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("quiz/progress getUser error", userError);
  }

  if (!user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  if (req.method === "POST") {
    // Save / update progress for a single subdomain
    try {
      const { domain, subdomain_code, correct, answered, accuracy } = req.body ?? {};

      if (!domain || !subdomain_code) {
        return res
          .status(400)
          .json({ ok: false, error: "domain and subdomain_code are required" });
      }

      const normDomain = String(domain).toUpperCase();
      const corr = Number(correct ?? 0);
      const ans = Number(answered ?? 0);

      let acc =
        typeof accuracy === "number"
          ? Math.round(accuracy)
          : ans > 0
          ? Math.round((corr / ans) * 100)
          : 0;

      // clamp 0–100
      acc = Math.max(0, Math.min(100, acc));

      // See if we already have a row for this user + subdomain
      const { data: existing, error: exErr } = await supabase
        .from("quiz_subdomain_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("subdomain_code", subdomain_code)
        .maybeSingle();

      if (exErr) {
        console.error("quiz/progress select existing error", exErr);
      }

      const attempts = (existing?.attempts ?? 0) + 1;
      const total_correct = (existing?.total_correct ?? 0) + corr;
      const total_answered = (existing?.total_answered ?? 0) + ans;
      const best_accuracy =
        existing?.best_accuracy != null
          ? Math.max(existing.best_accuracy, acc)
          : acc;

      const { data: upserted, error: upErr } = await supabase
        .from("quiz_subdomain_progress")
        .upsert(
          {
            user_id: user.id,
            domain: normDomain,
            subdomain_code,
            attempts,
            total_correct,
            total_answered,
            best_accuracy,
            last_accuracy: acc,
            last_completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,subdomain_code" }
        )
        .select()
        .maybeSingle();

      if (upErr) {
        console.error("quiz/progress upsert error", upErr);
        return res.status(500).json({ ok: false, error: upErr.message });
      }

      return res.status(200).json({ ok: true, row: upserted });
    } catch (err: any) {
      console.error("quiz/progress POST error", err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Server error" });
    }
  }

  if (req.method === "GET") {
    // Fetch all subdomain progress for the current user
    try {
      const { data, error } = await supabase
        .from("quiz_subdomain_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("subdomain_code", { ascending: true });

      if (error) {
        console.error("quiz/progress GET error", error);
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, rows: data ?? [] });
    } catch (err: any) {
      console.error("quiz/progress GET exception", err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Server error" });
    }
  }

  if (req.method === "DELETE") {
    // Clear ALL quiz progress for this user (for your "reset" button later)
    try {
      const { error } = await supabase
        .from("quiz_subdomain_progress")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("quiz/progress DELETE error", error);
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("quiz/progress DELETE exception", err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Server error" });
    }
  }

  res.setHeader("Allow", "GET,POST,DELETE");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}


