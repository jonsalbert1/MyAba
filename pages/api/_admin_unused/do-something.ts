// pages/api/admin/do-something.ts
// Minimal, type-agnostic handler to avoid Duplicate identifier issues.

import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  // limit to POST (adjust as needed)
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Auth (server-side)
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return res.status(500).json({ error: userErr.message });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  try {
    // EXAMPLE admin op (replace with your logic):
    // const { error } = await supabaseAdmin.from("some_table").insert({ ... });
    // if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}
