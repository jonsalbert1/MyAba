// pages/api/signup-notify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, id, created_at } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    if (!process.env.ADMIN_SIGNUP_NOTIFY_EMAIL) {
      console.error("Missing ADMIN_SIGNUP_NOTIFY_EMAIL env var");
      return res.status(500).json({ error: "Missing admin notify email" });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY env var");
      return res.status(500).json({ error: "Missing Resend API key" });
    }

    const fromEmail =
      process.env.FEEDBACK_FROM_EMAIL || "myABA <no-reply@myaba.app>";

    await resend.emails.send({
      from: fromEmail,
      to: process.env.ADMIN_SIGNUP_NOTIFY_EMAIL,
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
    console.error("signup-notify error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
