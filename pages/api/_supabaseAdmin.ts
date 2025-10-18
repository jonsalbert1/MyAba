import type { NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function json(res: NextApiResponse, status: number, body: any) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(status).end(JSON.stringify(body));
}
