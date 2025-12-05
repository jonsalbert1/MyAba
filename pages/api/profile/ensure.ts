// pages/api/profile/ensure.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

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

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  // 3️⃣ Send admin email ONLY if this is a brand new profile
  if (isNew) {
    try {
      await resend.emails.send({
        from: process.env.FEEDBACK_FROM_EMAIL!,   // your "from" address
        to: process.env.FEEDBACK_NOTIFY_EMAIL!,   // your admin email
        subject: "New myABA user signup",
        html: `
          <p>A new user just signed up for myABA.</p>
          <p>Email: ${user.email}</p>
        `,
      });
      console.log("[profile/ensure] Sent new user notify email for", user.email);
    } catch (err) {
      console.error("[profile/ensure] Error sending notify email:", err);
      // Don't fail the response just because email failed
    }
  }

  return res.status(200).json({ ok: true, isNew });
}
