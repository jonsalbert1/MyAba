import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const userId = getUserIdFromBearer(req);
  if (!userId) return res.status(401).json({ ok: false, error: "Auth session missing!" });

  try {
    const {
      deck,
      duration_seconds,
      correct,
      incorrect,
      run_started_at,
      run_ended_at,
    } = req.body ?? {};

    if (
      typeof duration_seconds !== "number" ||
      typeof correct !== "number" ||
      typeof incorrect !== "number" ||
      !run_started_at ||
      !run_ended_at
    ) {
      return res.status(400).json({ ok: false, error: "Bad payload" });
    }

    const { error } = await supabaseAdmin.from("safmeds_runs").insert({
      user_id: userId,
      deck: deck ?? null,
      duration_seconds,
      correct,
      incorrect,
      run_started_at,
      run_ended_at,
      // removed created_at to match your schema
    });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "Server error" });
  }
}
