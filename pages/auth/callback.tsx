// pages/auth/callback.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

/** Allow only safe, same-origin relative redirects like "/dashboard" */
function safeNext(path: string | undefined): string | null {
  if (!path) return null;
  try {
    // Reject absolute URLs or protocol-relative
    if (/^https?:\/\//i.test(path) || /^\/\//.test(path)) return null;
    // Force leading slash
    return path.startsWith("/") ? path : `/${path}`;
  } catch {
    return null;
  }
}

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finalizing sign-in…");

  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;

      try {
        const { code, token_hash, type, next } = router.query as {
          code?: string;
          token_hash?: string;
          type?: string;
          next?: string;
        };

        // Handle PKCE / OAuth style links (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // Handle classic magic link style (?token_hash=...&type=magiclink)
        else if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as "magiclink" | "email",
          });
          if (error) throw error;
        } else {
          setMsg("Missing auth params in URL.");
          return;
        }

        // Decide where to go next
        const target = safeNext(next) || "/";
        setMsg("Signed in. Redirecting…");
        router.replace(target);
      } catch (e: any) {
        setMsg(`Auth error: ${e?.message || "Unknown error"}`);
      }
    };

    run();
  }, [router]);

  return (
    <main className="mx-auto max-w-md p-6">
      <p className="text-sm text-gray-700">{msg}</p>
    </main>
  );
}
