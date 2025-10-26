import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = String(req.query.code || "");
  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  // Get user
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: "Unauthenticated" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("study_quiz_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("subdomain", code)
      .maybeSingle();

    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, data: data ?? null });
  }

  if (req.method === "POST") {
    const { last_index, correct_count, wrong_count } = req.body ?? {};
    const { data, error } = await supabase
      .from("study_quiz_state")
      .upsert({
        user_id: user.id,
        subdomain: code,
        last_index,
        correct_count,
        wrong_count,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, data });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
