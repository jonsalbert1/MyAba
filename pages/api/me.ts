// pages/api/me.ts
import { createServerClient } from "@supabase/ssr";
import { serialize } from "cookie";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type Resp =
  | { ok: true; user: any | null; profile?: { is_admin: boolean } }
  | { ok: false; error: string };

export default async function handler(
  req: any,
  res: any<Resp>
) {
  try {
    res.setHeader("Cache-Control", "no-store");

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    if (!url || !anon) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing Supabase env (URL/ANON)" });
    }

    // SSR client reads auth from cookies
    const supabase = createServerClient(url, anon, {
      cookies: {
        get: (name: string) => req.cookies[name],
        set: (name: string, value: string, options: any) => {
          res.setHeader("Set-Cookie", serialize(name, value, options));
        },
        remove: (name: string, options: any) => {
          res.setHeader(
            "Set-Cookie",
            serialize(name, "", { ...options, maxAge: 0 })
          );
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Not fatal—just means no signed-in user
      return res.status(200).json({ ok: true, user: null });
    }
    const user = data?.user ?? null;
    if (!user) {
      return res.status(200).json({ ok: true, user: null });
    }

    // Optional admin lookup (only if service role is configured)
    let is_admin = false;
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (serviceKey) {
      try {
        const admin = createAdminClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: profile } = await admin
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        is_admin = Boolean(profile?.is_admin);
      } catch {
        is_admin = false;
      }
    }

    return res.status(200).json({ ok: true, user, profile: { is_admin } });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Unknown error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


