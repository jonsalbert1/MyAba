// pages/api/profile/ensure.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createPagesServerClient({ req, res });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[profile/ensure] Not authenticated:", userError);
    return res.status(401).json({ error: "Not authenticated" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[profile/ensure] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1️⃣ Check if profile already exists for this user.id
  const { data: existingProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[profile/ensure] Error checking profile:", profileError);
    return res.status(500).json({ error: "Profile check failed" });
  }

  let isNew = false;

  if (!existingProfile) {
    // 2️⃣ Create profile only if it doesn't exist
    const { error: insertError } = await supabaseAdmin.from("profiles").insert({
      id: user.id,
      email: user.email,
      // add other default fields here if you have them
    });

    if (insertError) {
      console.error("[profile/ensure] Error creating profile:", insertError);
      return res.status(500).json({ error: "Profile create failed" });
    }

    isNew = true;
  }

  console.log("[profile/ensure] user:", user.email, "isNew:", isNew);

  // 3️⃣ Send admin email ONLY if this is a brand new profile AND emailing is enabled
  // Enable by setting: SEND_RESEND_EMAILS=true (e.g., in Vercel env if you ever want it)
  if (isNew && process.env.SEND_RESEND_EMAILS === "true") {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
    const notifyEmail = process.env.FEEDBACK_NOTIFY_EMAIL;

    if (!resendKey) {
      console.warn("[profile/ensure] SEND_RESEND_EMAILS=true but RESEND_API_KEY is missing. Skipping email.");
    } else if (!fromEmail || !notifyEmail) {
      console.warn(
        "[profile/ensure] SEND_RESEND_EMAILS=true but FEEDBACK_FROM_EMAIL or FEEDBACK_NOTIFY_EMAIL is missing. Skipping email."
      );
    } else {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: fromEmail,         // your "from" address
          to: notifyEmail,         // your admin email
          subject: "New myABA user signup",
          html: `
            <p>A new user just signed up for myABA.</p>
            <p>Email: ${user.email ?? "(no email provided)"}</p>
          `,
        });
        console.log("[profile/ensure] Sent new user notify email for", user.email);
      } catch (err) {
        console.error("[profile/ensure] Error sending notify email:", err);
        // Don't fail the response just because email failed
      }
    }
  }

  return res.status(200).json({ ok: true, isNew });
}
