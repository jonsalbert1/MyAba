import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const hasUrl = url.length > 0;
  const hasService = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  res.status(200).json({
    has_SUPABASE_URL: hasUrl,
    has_SERVICE_ROLE_KEY: hasService,
    url_prefix: url.slice(0, 12),
  });
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
