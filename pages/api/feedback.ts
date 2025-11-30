import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

type Data = { ok: true } | { ok: false; error: string };

const resend =
  process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

  // Fall back to "other" if category is missing or weird.
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

    // Optional: notify admin by email, but don't fail the request if this breaks
    if (resend && process.env.FEEDBACK_NOTIFY_EMAIL) {
      const adminTo = process.env.FEEDBACK_NOTIFY_EMAIL;
      const fromAddress =
        process.env.FEEDBACK_FROM_EMAIL || "feedback@myaba.app";

      try {
        await resend.emails.send({
          from: `myABA Feedback <${fromAddress}>`,
          to: adminTo,
          subject: `[myABA] ${safeCategory} feedback`,
          text:
            `New feedback received.\n\n` +
            `Category: ${safeCategory}\n` +
            (email ? `From: ${email}\n` : "") +
            (userId ? `User ID: ${userId}\n\n` : "\n") +
            `Message:\n${message}`,
        });
      } catch (mailErr) {
        console.error("feedback email send error:", mailErr);
        // but we still return ok: true, because DB insert worked
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("feedback unexpected error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Unexpected error",
    });
  }
}
