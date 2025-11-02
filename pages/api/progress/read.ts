import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function setCookies(res: NextApiResponse, cookies: { name: string; value: string; options: CookieOptions }[]) {
  res.setHeader("Set-Cookie", cookies.map(({ name, value, options }) => {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`];
    if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
    if (options.httpOnly) parts.push("HttpOnly");
    if (options.secure) parts.push("Secure");
    return parts.join("; ");
  }));
}

function setNoCache(res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("Last-Modified", new Date().toUTCString());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      setNoCache(res);
      return res.status(405).json({ ok: false, error: "Use GET" });
    }

    // Prefer Bearer token, fallback to cookie session
    const raw = req.headers.authorization ?? "";
    const token = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : null;
    let userId: string | null = null;

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error) userId = data.user?.id ?? null;
    }

    if (!userId) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => {
              const cookie = req.headers.cookie ?? "";
              if (!cookie) return [];
              return cookie.split(";").map((c) => {
                const [n, ...v] = c.trim().split("=");
                return { name: n, value: v.join("=") };
              });
            },
            setAll: (cookies) => setCookies(res, cookies as any),
          },
        }
      );
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    }

    if (!userId) {
      setNoCache(res);
      return res.status(401).json({ ok: false, error: "Auth session missing!" });
    }

    const rawSub = req.query.subdomain;
    const subdomain = typeof rawSub === "string" ? rawSub.trim() : Array.isArray(rawSub) ? rawSub[0]?.trim() : undefined;

    let q = supabaseAdmin
      .from("study_quiz_state")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (subdomain) q = q.eq("subdomain", subdomain);

    const { data, error } = await q.limit(50);
    if (error) {
      setNoCache(res);
      return res.status(500).json({ ok: false, error: error.message });
    }

    setNoCache(res);
    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    setNoCache(res);
    return res.status(500).json({ ok: false, error: e?.message ?? "Unexpected error" });
  }
}
