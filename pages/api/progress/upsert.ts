// pages/api/progress/upsert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Ensure Node runtime (Pages API) */
export const config = {
  api: { bodyParser: true }, // allow JSON bodies
};

function setCookies(res: NextApiResponse, cookies: { name: string; value: string; options: CookieOptions }[]) {
  res.setHeader(
    "Set-Cookie",
    cookies.map(({ name, value, options }) => {
      const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
      parts.push(`Path=${options.path ?? "/"}`);
      if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
      if (options.domain) parts.push(`Domain=${options.domain}`);
      if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      if (options.httpOnly) parts.push("HttpOnly");
      if (options.secure) parts.push("Secure");
      return parts.join("; ");
    })
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });

    const debug = String(req.query.debug ?? "") === "1";

    // --- 1) Resolve user (Bearer first, then cookies)
    let userId: string | null = null;
    let authMode: "bearer" | "cookie" | "none" = "none";

    const rawAuth = req.headers.authorization ?? "";
    const token = rawAuth.startsWith("Bearer ") ? rawAuth.slice("Bearer ".length).trim() : null;

    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user?.id) {
        userId = data.user.id;
        authMode = "bearer";
      }
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
      if (data?.user?.id) {
        userId = data.user.id;
        authMode = "cookie";
      }
    }

    if (!userId) {
      return res.status(401).json({ ok: false, error: "Auth session missing!", details: { authMode } });
    }

    // --- 2) Parse & validate body
    type Body = {
      subdomain: string;
      last_index?: number | string | null;
      best_accuracy?: number | string | null;
      done?: boolean | null;
    };
    const body = (req.body || {}) as Body;

    const subdomainRaw = (body.subdomain ?? "").toString().trim();
    if (!subdomainRaw) {
      return res.status(400).json({ ok: false, error: "Missing subdomain", details: { body } });
    }

    const payload = {
      user_id: userId,
      subdomain: subdomainRaw.toUpperCase(),
      last_index:
        body.last_index === null || body.last_index === undefined
          ? null
          : Number.isFinite(Number(body.last_index))
          ? Number(body.last_index)
          : null,
      best_accuracy:
        body.best_accuracy === null || body.best_accuracy === undefined
          ? null
          : Number.isFinite(Number(body.best_accuracy))
          ? Number(body.best_accuracy)
          : null,
      done: typeof body.done === "boolean" ? body.done : null,
      updated_at: new Date().toISOString(),
    };

    // --- 3) Probe: ensure admin client OK (table exists + service role)
    const probe = await supabaseAdmin.from("study_quiz_state").select("user_id").limit(1);
    if (probe.error) {
      return res.status(500).json({
        ok: false,
        error: "Admin probe failed (check SUPABASE_SERVICE_ROLE_KEY / table / RLS).",
        details: { probe: probe.error.message },
        hint:
          "Confirm SUPABASE_SERVICE_ROLE_KEY is set (not anon), table 'study_quiz_state' exists, and RLS won't block service role.",
      });
    }

    // --- 4) Upsert (requires UNIQUE (user_id, subdomain))
    const upsert = supabaseAdmin
      .from("study_quiz_state")
      .upsert(payload, { onConflict: "user_id,subdomain" })
      .select()
      .single(); // return the row so you can see it

    const { data: row, error } = await upsert;

    if (error) {
      const msg = error.message || "";
      const needsUnique =
        /no unique|constraint.*on conflict|does not match any|unique or exclusion/i.test(msg);
      const rlsHit =
        /violates row-level security|RLS|permission denied|not allowed/i.test(msg);
      const missingRel = /relation .* does not exist/i.test(msg);

      return res.status(500).json({
        ok: false,
        error: msg,
        details: { authMode, payload },
        hint: needsUnique
          ? 'Add UNIQUE: ALTER TABLE "study_quiz_state" ADD CONSTRAINT "study_quiz_state_user_subdomain_unique" UNIQUE ("user_id","subdomain");'
          : rlsHit
          ? "RLS blocked write. Ensure supabaseAdmin uses the SERVICE ROLE key or relax RLS."
          : missingRel
          ? "Create the table (see migration snippet)."
          : undefined,
      });
    }

    if (debug) {
      return res.status(200).json({ ok: true, debug: { authMode, userId, payload }, row });
    }

    return res.status(200).json({ ok: true, row });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "Unexpected error" });
  }
}
