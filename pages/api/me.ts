// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type Resp =
  | { ok: true; authenticated: false; reason?: string; debug?: any }
  | { ok: true; authenticated: true; user: { id: string; email: string | null }; debug?: any }
  | { ok: false; error: string; debug?: any };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  // Only allow GETs
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const debugMode = req.query.debug === "1";

  try {
    // Build Supabase client from request/response (Pages Router)
    const supabase = createPagesServerClient({ req, res });

    // Ask Supabase for the user associated with the auth cookie
    const { data, error } = await supabase.auth.getUser();

    // If there is *no* valid session/cookie, respond 200 unauthenticated (not a server error)
    if (error) {
      // Treat common auth-helper errors as "not logged in"
      const unauthReasons = new Set([401, 400]);
      const status = (error as any)?.status ?? (error as any)?.code ?? 0;

      if (unauthReasons.has(Number(status)) || /JWT|cookie|session/i.test(String(error.message))) {
        return res.status(200).json({
          ok: true,
          authenticated: false,
          reason: debugMode ? `auth error: ${error.message}` : undefined,
          debug: debugMode
            ? {
                cookiesPresent: Boolean(req.headers.cookie),
                supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                status,
              }
            : undefined,
        });
      }

      // Any other unexpected error -> still return 200 unauthenticated (to avoid noisy 500s)
      return res.status(200).json({
        ok: true,
        authenticated: false,
        reason: debugMode ? `unexpected auth error: ${error.message}` : undefined,
        debug: debugMode ? { status } : undefined,
      });
    }

    // No error; check if user exists
    const user = data?.user ?? null;
    if (!user) {
      return res.status(200).json({
        ok: true,
        authenticated: false,
        reason: debugMode ? "no user in data" : undefined,
      });
    }

    // Authenticated
    return res.status(200).json({
      ok: true,
      authenticated: true,
      user: { id: user.id, email: user.email },
      debug: debugMode ? { cookiesPresent: Boolean(req.headers.cookie) } : undefined,
    });
  } catch (e: any) {
    // Truly unexpected failure (network, crash, etc.)
    return res.status(200).json({
      ok: true,
      authenticated: false,
      reason: debugMode ? `throw: ${e?.message}` : undefined,
      debug: debugMode
        ? {
            cookiesPresent: Boolean(req.headers.cookie),
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          }
        : undefined,
    });
  }
}
