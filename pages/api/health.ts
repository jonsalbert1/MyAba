// pages/api/health.ts
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, ts: Date.now() });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


