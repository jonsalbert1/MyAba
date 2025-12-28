// pages/api/quiz/reset-progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.error("quiz/reset-progress getUser error", userErr);
    }

    if (!user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    // ✅ Clear per-subdomain progress (all domains)
    const { error: delProgressErr } = await supabaseAdmin
      .from("quiz_subdomain_progress")
      .delete()
      .eq("user_id", user.id);

    if (delProgressErr) {
      console.error("quiz/reset-progress delete progress error", delProgressErr);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to clear quiz progress" });
    }

    // ✅ Also clear attempts (prevents stale in_progress attempts from breaking runner)
    const { error: delAttemptsErr } = await supabaseAdmin
      .from("quiz_attempts")
      .delete()
      .eq("user_id", user.id);

    if (delAttemptsErr) {
      console.error("quiz/reset-progress delete attempts error", delAttemptsErr);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to clear quiz attempts" });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("quiz/reset-progress exception", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
}
