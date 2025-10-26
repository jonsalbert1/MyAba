// pages/api/progress/upsert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return res.status(500).json({ error: userErr.message });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { code, domain, done, best_accuracy } = req.body ?? {};
  if (!code || !domain) return res.status(400).json({ error: "Missing code or domain" });

  // Table: quiz_progress (see SQL below)
  const { error: upsertErr } = await supabase
    .from("quiz_progress")
    .upsert(
      {
        user_id: user.id,
        domain,
        code,
        done: !!done,
        best_accuracy: typeof best_accuracy === "number" ? Math.max(0, Math.min(100, Math.round(best_accuracy))) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,code" }
    );

  if (upsertErr) return res.status(500).json({ error: upsertErr.message });
  return res.status(200).json({ ok: true });
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
