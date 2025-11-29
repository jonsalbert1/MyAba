// pages/api/quiz/reset-domain.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Data = { ok: true } | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { domain, userId } = req.body as {
    domain?: string;
    userId?: string;
  };

  if (!userId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing userId in request body" });
  }

  const domainUpper = domain ? String(domain).toUpperCase() : undefined;

  try {
    // 1) Delete from the per-subdomain progress table
    let progressQuery = supabaseAdmin
      .from("quiz_subdomain_progress")
      .delete()
      .eq("user_id", userId);

    if (domainUpper) {
      progressQuery = progressQuery.eq("domain", domainUpper);
    }

    const { error: delProgressErr } = await progressQuery;
    if (delProgressErr) throw delProgressErr;

    // 2) Delete from raw attempts
    let attemptsQuery = supabaseAdmin
      .from("quiz_attempts")
      .delete()
      .eq("user_id", userId);

    if (domainUpper) {
      attemptsQuery = attemptsQuery.eq("domain", domainUpper);
    }

    const { error: delAttemptsErr } = await attemptsQuery;
    if (delAttemptsErr) throw delAttemptsErr;

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("reset-domain error", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unknown error" });
  }
}
