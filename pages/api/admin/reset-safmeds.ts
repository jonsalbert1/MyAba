// pages/api/admin/reset-safmeds.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ApiResponse =
  | { ok: true }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { userId } = req.body as { userId?: string };

  if (!userId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing userId in request body" });
  }

  // 1) Check that the caller is an authenticated admin
  const supabase = createPagesServerClient<any>({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res
      .status(401)
      .json({ ok: false, error: "Not authenticated" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Admin check error:", profileError);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to verify admin status" });
  }

  if (!profile?.is_admin) {
    return res
      .status(403)
      .json({ ok: false, error: "Admin access required" });
  }

  // 2) Delete SAFMEDS data for the target user
  try {
    // Adjust table names if yours differ
    const { error: runsError } = await supabaseAdmin
      .from("safmeds_runs")
      .delete()
      .eq("user_id", userId);

    if (runsError) {
      console.error("Error deleting safmeds_runs:", runsError);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to delete SAFMEDS runs" });
    }

    // If you have any other related SAFMEDS tables, delete there too
    // e.g. safmeds_daily_summaries, etc.

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Unexpected error in reset-safmeds:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unknown error" });
  }
}
