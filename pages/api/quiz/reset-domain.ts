// pages/api/quiz/reset-domain.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Data = { ok: true } | { ok: false; error: string };

const VALID_DOMAINS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // ✅ Get the user from the session (don’t trust userId from the client)
  const supabase = createPagesServerClient({ req, res });
  const { data: userResp, error: userError } = await supabase.auth.getUser();

  if (userError || !userResp?.user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const userId = userResp.user.id;

  const { domain } = (req.body ?? {}) as { domain?: string };
  const domainUpper = domain ? String(domain).toUpperCase().trim() : undefined;

  if (domainUpper && !VALID_DOMAINS.has(domainUpper)) {
    return res.status(400).json({ ok: false, error: "Invalid domain" });
  }

  try {
    // 1) Delete per-subdomain progress
    let progressQuery = supabaseAdmin
      .from("quiz_subdomain_progress")
      .delete()
      .eq("user_id", userId);

    if (domainUpper) {
      progressQuery = progressQuery.eq("domain", domainUpper);
    }

    const { error: delProgressErr } = await progressQuery;
    if (delProgressErr) throw delProgressErr;

    // 2) Delete attempts (including in_progress stale attempts)
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
    return res.status(500).json({ ok: false, error: err?.message ?? "Unknown error" });
  }
}
