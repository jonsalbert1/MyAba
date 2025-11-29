// pages/api/admin/upload-quiz.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLE = process.env.QUIZ_TABLE_NAME || "quiz_questions";

/**
 * POST body shape (example):
 * {
 *   "rows": [{ /* columns matching your table */ /* }],
 *   "onConflict": "id" // or "code", etc. (optional)
 * }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body ?? {};
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ ok: false, error: "rows[] required" });
    }

    const onConflict = body.onConflict || "id";
    const { error } = await supabaseAdmin.from(TABLE).upsert(rows, { onConflict });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, count: rows.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Unexpected error" });
  }
}
