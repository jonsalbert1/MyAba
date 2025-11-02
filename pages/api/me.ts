// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

type ApiUser = { id: string; email: string | null };

type Resp =
  | { ok: true; authenticated: false; reason?: string; debug?: any }
  | { ok: true; authenticated: true; user: ApiUser; debug?: any }
  | { ok: false; error: string; debug?: any };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const debugMode = req.query.debug === "1";

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      const unauthStatuses = new Set([400, 401]);
      const status = (error as any)?.status ?? (error as any)?.code ?? 0;

      if (unauthStatuses.has(Number(status)) || /JWT|cookie|session/i.test(String(error.message))) {
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

      return res.status(200).json({
        ok: true,
        authenticated: false,
        reason: debugMode ? `unexpected auth error: ${error.message}` : undefined,
        debug: debugMode ? { status } : undefined,
      });
    }

    const user = data?.user ?? null;
    if (!user) {
      return res.status(200).json({
        ok: true,
        authenticated: false,
        reason: debugMode ? "no user in data" : undefined,
      });
    }

    const apiUser: ApiUser = { id: String(user.id), email: user.email ?? null };

    return res.status(200).json({
      ok: true,
      authenticated: true,
      user: apiUser,
      debug: debugMode ? { cookiesPresent: Boolean(req.headers.cookie) } : undefined,
    });
  } catch (e: any) {
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
