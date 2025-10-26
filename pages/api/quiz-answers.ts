// pages/api/quiz-answers.ts
import type { NextApiRequest, NextApiResponse } from "next";

const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // use service role to insert

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
    if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");

    const body = req.body || {};
    const item_id = String(body.item_id ?? "").trim();
    const picked = String(body.picked_choice ?? "").trim().toUpperCase();
    const correct_choice = String(body.correct_choice ?? "").trim().toUpperCase();
    const domain = body.domain ? String(body.domain) : null;
    const subdomain = body.subdomain ? String(body.subdomain) : null;

    if (!item_id || !["A","B","C","D"].includes(picked) || !["A","B","C","D"].includes(correct_choice)) {
      return res.status(400).json({ ok: false, error: "item_id, picked_choice, correct_choice required (A/B/C/D)" });
    }

    const row = {
      item_id,
      picked_choice: picked,
      correct_choice,
      is_correct: picked === correct_choice,
      domain,
      subdomain
    };

    const resp = await fetch(`${url}/rest/v1/study_quiz_answers`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(row)
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return res.status(500).json({ ok: false, error: `Supabase REST ${resp.status}: ${t}` });
    }

    const inserted = await resp.json();
    return res.status(200).json({ ok: true, inserted: inserted.length, is_correct: row.is_correct });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
