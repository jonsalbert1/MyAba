import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res });


  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const codes: string[] = Array.isArray(req.body?.codes) ? req.body.codes : [];
  if (codes.length === 0) {
    return res.status(400).json({ ok: false, error: "Missing codes" });
  }

  const results = codes.map((code) => ({
    code,
    totalBatches: 10,
    completedBatches: 0,
    currentBatch: 1,
    answeredInCurrent: 0,
    status: "no_items" as const,
  }));

  return res.status(200).json({ ok: true, data: results });
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
