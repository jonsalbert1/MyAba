// pages/api/quiz/state.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StudyQuizState = {
  user_id: string;
  subdomain: string;           // e.g., "A1"
  last_index?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
  updated_at?: string | null;
};

/** Minimal cookie serializer for Next.js Pages API */
function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
  if (options.httpOnly ?? true) parts.push("HttpOnly");
  if (options.secure ?? true) parts.push("Secure");
  const sameSite = options.sameSite ?? "lax";
  if (sameSite) parts.push(`SameSite=${String(sameSite).charAt(0).toUpperCase()}${String(sameSite).slice(1)}`);
  return parts.join("; ");
}

/** Create a server client wired to Next.js Pages API req/res cookies */
function getSupabaseFromReqRes(req: any, res: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get: (name: string) => req.cookies?.[name],
        set: (name: string, value: string, options: CookieOptions) => {
          const prev = res.getHeader("Set-Cookie");
          const cookie = serializeCookie(name, value, options);
          if (Array.isArray(prev)) res.setHeader("Set-Cookie", [...prev, cookie]);
          else if (prev) res.setHeader("Set-Cookie", [prev as string, cookie]);
          else res.setHeader("Set-Cookie", [cookie]);
        },
        remove: (name: string, options: CookieOptions) => {
          const prev = res.getHeader("Set-Cookie");
          const cookie = serializeCookie(name, "", { ...options, maxAge: 0 });
          if (Array.isArray(prev)) res.setHeader("Set-Cookie", [...prev, cookie]);
          else if (prev) res.setHeader("Set-Cookie", [prev as string, cookie]);
          else res.setHeader("Set-Cookie", [cookie]);
        },
      },
    }
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Auth via @supabase/ssr
    const supabase = getSupabaseFromReqRes(req, res);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return res.status(500).json({ ok: false, error: userErr.message });
    if (!user) return res.status(401).json({ ok: false, error: "Not authenticated" });

    const { code, last_index, correct_count, wrong_count } = req.body ?? {};
    if (!code || typeof code !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'code' (subdomain) in body" });
    }

    const row: StudyQuizState = {
      user_id: user.id,
      subdomain: code,
      last_index: Number.isFinite(last_index) ? Number(last_index) : null,
      correct_count: Number.isFinite(correct_count) ? Number(correct_count) : null,
      wrong_count: Number.isFinite(wrong_count) ? Number(wrong_count) : null,
      updated_at: new Date().toISOString(),
    };

    // Upsert with service role (TS bypass to avoid never[] inference)
    const { error } = await (supabaseAdmin as any)
      .from("study_quiz_state")
      // adjust to match your unique constraint/index
      .upsert(row, { onConflict: "user_id,subdomain" });

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Unexpected error" });
  }
}
