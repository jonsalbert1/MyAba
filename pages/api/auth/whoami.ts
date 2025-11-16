// pages/api/auth/whoami.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sb = createPagesServerClient({ req, res });
  const { data: { user } } = await sb.auth.getUser();
  if (user?.id) return res.status(200).json({ ok: true, source: "cookie", user: { id: user.id, email: user.email } });

  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data?.user?.id) return res.status(200).json({ ok: true, source: "bearer", user: { id: data.user.id, email: data.user.email } });
  }
  return res.status(401).json({ ok: false, error: "No session" });
}
