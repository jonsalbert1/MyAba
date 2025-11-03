import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Parse user id (sub) from Bearer JWT; pragmatic dev fix */
function getUserIdFromBearer(req: NextApiRequest): string | null {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const b64 = payloadB64.padEnd(payloadB64.length + (4 - (payloadB64.length % 4)) % 4, "=");
    const json = Buffer.from(b64, "base64").toString("utf8");
    const payload = JSON.parse(json);
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let userId = getUserIdFromBearer(req);
  if (!userId && typeof req.query.user_id === "string" && req.query.user_id.trim()) {
    userId = req.query.user_id.trim(); // dev fallback
  }
  if (!userId) return res.status(401).json({ ok: false, error: "Auth session missing!" });

  const start = String(req.query.start ?? "");
  const end   = String(req.query.end ?? "");
  if (!start || !end) return res.status(400).json({ ok: false, error: "Missing start/end" });

  try {
    const { data, error } = await supabaseAdmin
      .from("safmeds_runs")
      .select(
        // removed created_at to match your schema
        "id,user_id,deck,correct,incorrect,duration_seconds,run_started_at,run_ended_at"
      )
      .eq("user_id", userId)
      .gte("run_started_at", start)
      .lt("run_started_at", end)
      .order("run_started_at", { ascending: true });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "Server error" });
  }
}
