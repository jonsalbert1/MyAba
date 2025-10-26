// pages/api/health.ts
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true, ts: Date.now() });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

