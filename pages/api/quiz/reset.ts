// pages/api/quiz/reset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Data =
  | { ok: true }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const { user_id } = req.body as { user_id?: string };

    if (!user_id) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing user_id in request body." });
    }

    // ❗ Adjust "quiz_attempts" if your table is named differently
    const { error } = await supabaseAdmin
      .from("quiz_attempts")
      .delete()
      .eq("user_id", user_id);

    if (error) {
      console.error("quiz/reset delete error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("quiz/reset exception:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Unknown error" });
  }
}
