// pages/api/admin/reset-quiz.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Data =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { userId } = req.body as { userId?: string };

  if (!userId) {
    return res.status(400).json({
      ok: false,
      error: "Missing userId in request body",
    });
  }

  try {
    console.log("reset-quiz: requested for userId =", userId);

    // Delete quiz attempts for this user and return the deleted rows
    const { data, error: attemptsError } = await supabaseAdmin
      .from("quiz_attempts")
      .delete()
      .eq("user_id", userId)
      .select("id"); // select so we can see how many were deleted

    if (attemptsError) {
      console.error("reset-quiz: error deleting quiz_attempts:", attemptsError);
      return res.status(500).json({
        ok: false,
        error: attemptsError.message ?? "Failed to delete quiz attempts",
      });
    }

    const deletedCount = data?.length ?? 0;
    console.log(
      `reset-quiz: deleted ${deletedCount} quiz_attempts row(s) for userId =`,
      userId
    );

    return res.status(200).json({ ok: true, deletedCount });
  } catch (err: any) {
    console.error("reset-quiz: unexpected error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Unexpected error",
    });
  }
}
