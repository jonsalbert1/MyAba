// pages/api/signup-notify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Global kill switch: only send if explicitly enabled
  // Set in env: SEND_RESEND_EMAILS=true
  if (process.env.SEND_RESEND_EMAILS !== "true") {
    return res.status(200).json({ ok: true, skipped: "resend_disabled" });
  }

  try {
    const { email, id, created_at } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const notifyEmail = process.env.ADMIN_SIGNUP_NOTIFY_EMAIL;
    if (!notifyEmail) {
      console.warn("[signup-notify] Missing ADMIN_SIGNUP_NOTIFY_EMAIL; skipping email.");
      return res.status(200).json({ ok: true, skipped: "missing_admin_notify_email" });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("[signup-notify] Missing RESEND_API_KEY; skipping email.");
      return res.status(200).json({ ok: true, skipped: "missing_resend_key" });
    }

    const fromEmail = process.env.FEEDBACK_FROM_EMAIL || "myABA <no-reply@myaba.app>";

    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      subject: `New myABA signup: ${email}`,
      text: [
        `A new user just signed up for myABA.`,
        ``,
        `Email: ${email}`,
        id ? `User ID: ${id}` : "",
        created_at ? `Created at: ${created_at}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[signup-notify] error:", err);
    // Don’t leak provider errors to client
    return res.status(500).json({ error: "Internal error" });
  }
}
