// pages/api/admin/profiles.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AdminProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean | null;
  created_at: string | null;
};

type Data =
  | { ok: true; profiles: AdminProfile[] }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  // Browser auth client (tied to the logged-in user)
  const supabase = createPagesServerClient({ req, res });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res
      .status(401)
      .json({ ok: false, error: "Not authenticated" });
  }

  // Check this user is actually marked admin in profiles (via RLS-safe client)
  const { data: me, error: meError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (meError) {
    console.error("Admin profiles: error loading self profile:", meError);
    return res
      .status(500)
      .json({ ok: false, error: "Error verifying admin status" });
  }

  if (!me?.is_admin) {
    return res
      .status(403)
      .json({ ok: false, error: "Not an admin" });
  }

  // Now use service role to bypass RLS and list all profiles
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, is_admin, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Admin profiles: supabaseAdmin error:", error);
    return res
      .status(500)
      .json({ ok: false, error: "Error loading profiles" });
  }

  return res.status(200).json({
    ok: true,
    profiles: (data ?? []) as AdminProfile[],
  });
}
