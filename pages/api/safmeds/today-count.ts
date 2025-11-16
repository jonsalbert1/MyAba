// pages/api/safmeds/today-count.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type OkResponse = {
  ok: true;
  used: number;
  remaining: number;
};

type ErrorResponse = {
  ok: false;
  error: string;
};

type ApiResponse = OkResponse | ErrorResponse;

const DAILY_LIMIT = 5;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Use GET" });
  }

  // Supabase client bound to this request/response
  const supabase = createPagesServerClient({ req, res });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res
      .status(401)
      .json({ ok: false, error: "Not authenticated" });
  }

  // Compute today's start/end (local to server)
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  // Count runs for this user within today
  const { count, error } = await supabase
    .from("safmeds_runs")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .gte("run_started_at", start.toISOString())
    .lt("run_started_at", end.toISOString());

  if (error) {
    console.error("SAFMEDS today-count error:", error);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to load today count" });
  }

  const used = count ?? 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  return res.status(200).json({
    ok: true,
    used,
    remaining,
  });
}
