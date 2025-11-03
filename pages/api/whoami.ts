// pages/api/whoami.ts
import { createServerClient } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies[n], set(){}, remove(){} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  res.status(200).json({ ok: true, user: user ? { id: user.id, email: user.email } : null });
}
