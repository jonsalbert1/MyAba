// lib/supabaseServer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { serialize } from "cookie";

export function createSupabaseServerClient(req: NextApiRequest, res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies[name];
      },
      set(name: string, value: string, options: CookieOptions) {
        // Set cookie on response so Supabase can manage session refresh
        res.setHeader("Set-Cookie", serialize(name, value, { path: "/", ...options }));
      },
      remove(name: string, options: CookieOptions) {
        res.setHeader("Set-Cookie", serialize(name, "", { path: "/", maxAge: 0, ...options }));
      },
    },
  });
}
