// pages/api/quiz/reset-progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

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

    // 🔥 Delete all rows for this user
    const { error: delErr } = await supabase
      .from("quiz_subdomain_progress")
      .delete()
      .eq("user_id", user.id);

    if (delErr) {
      console.error("quiz/reset-progress delete error", delErr);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to clear quiz progress" });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("quiz/reset-progress exception", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
}
