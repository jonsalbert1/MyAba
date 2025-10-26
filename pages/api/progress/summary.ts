import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient(req, res);

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const { data, error } = await supabase
    .from("quiz_subdomain_progress")
    .select("domain, code, done, best_accuracy, last_seen_at")
    .eq("user_id", user.id);

  if (error) return res.status(400).json({ ok: false, error: error.message });

  const result: Record<string, { completed: number; accuracyPercent: number; lastCode: string | null; _lastSeen?: string }> = {};
  const domains = ["A","B","C","D","E","F","G","H","I"];
  for (const d of domains) result[d] = { completed: 0, accuracyPercent: 0, lastCode: null };

  for (const row of data ?? []) {
    const d = row.domain as string;
    if (!result[d]) result[d] = { completed: 0, accuracyPercent: 0, lastCode: null };
    if (row.done) result[d].completed += 1;
    result[d].accuracyPercent = Math.max(result[d].accuracyPercent, row.best_accuracy ?? 0);
    if (!result[d]._lastSeen || new Date(row.last_seen_at) > new Date(result[d]._lastSeen!)) {
      result[d]._lastSeen = row.last_seen_at!;
      result[d].lastCode = row.code!;
    }
  }
  for (const d of domains) delete (result[d] as any)._lastSeen;

  res.json({ ok: true, data: result });
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
