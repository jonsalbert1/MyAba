// pages/api/feedback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Data = { ok: true } | { ok: false; error: string };

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

  const { category, message, userId, email } = req.body as {
    category?: string;
    message?: string;
    userId?: string | null;
    email?: string | null;
  };

  if (!message || !message.trim()) {
    return res.status(400).json({
      ok: false,
      error: "Feedback message is required",
    });
  }

  // Fall back to "other" if category is missing or invalid
  const safeCategory =
    category && ["bug", "feature", "question", "other"].includes(category)
      ? category
      : "other";

  try {
    // ✅ Only use columns we know exist: category, message, email, user_id
    const { error } = await supabaseAdmin
      .from("feedback")
      .insert({
        category: safeCategory,
        message,
        email: email ?? null,
        user_id: userId ?? null,
      });

    if (error) {
      console.error("feedback insert error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message ?? "Failed to save feedback",
      });
    }

    // 🔇 No admin emails for now – just store feedback and return success
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("feedback unexpected error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Unexpected error",
    });
  }
}
