// pages/api/me.ts
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: any, res: any) {
  try {
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!user) return res.status(200).json({ ok: true, authenticated: false });

    return res.status(200).json({
      ok: true,
      authenticated: true,
      user: { id: user.id, email: user.email },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Unexpected error" });
  }
}
