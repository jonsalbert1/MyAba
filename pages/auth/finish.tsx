// pages/auth/finish.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

function safeInternalPath(v: unknown) {
  if (typeof v !== "string") return null;
  if (!v.startsWith("/")) return null;
  return v;
}

export default function AuthFinish() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    if (!router.isReady) return;

    const redirectedFrom = safeInternalPath(router.query.redirectedFrom) ?? "/";
    const mode = typeof router.query.mode === "string" ? router.query.mode : "login";

    // Wait for auth hydration
    if (user === undefined) return;

    // Not signed in (shouldn’t happen often) → go login
    if (user === null) {
      router.replace(`/login?redirectedFrom=${encodeURIComponent(redirectedFrom)}`);
      return;
    }

    (async () => {
      try {
        // ✅ If this was a SIGNUP, we expect names to be present in localStorage
        if (mode === "signup") {
          const first = (localStorage.getItem("myaba_pending_first") ?? "").trim();
          const last = (localStorage.getItem("myaba_pending_last") ?? "").trim();

          // If missing, fall back to /auth/profile (rare)
          if (!first || !last) {
            router.replace(`/auth/profile?redirectedFrom=${encodeURIComponent(redirectedFrom)}`);
            return;
          }

          // ✅ Prefer UPDATE (keeps your webhook behavior consistent)
          // If no row exists, we'll insert via upsert as a fallback
          const updateRes = await supabase
            .from("profiles")
            .update({ first_name: first, last_name: last })
            .eq("id", user.id);

          if (updateRes.error) {
            console.error("[auth/finish] profile update error", updateRes.error);

            const upsertRes = await supabase.from("profiles").upsert({
              id: user.id,
              first_name: first,
              last_name: last,
            });

            if (upsertRes.error) {
              console.error("[auth/finish] profile upsert error", upsertRes.error);
              router.replace(`/auth/profile?redirectedFrom=${encodeURIComponent(redirectedFrom)}`);
              return;
            }
          }

          // ✅ Clear pending signup data ONLY after successful save
          localStorage.removeItem("myaba_pending_first");
          localStorage.removeItem("myaba_pending_last");
          localStorage.removeItem("myaba_pending_email");
          localStorage.removeItem("myaba_pending_redirect");
        }

        // ✅ For LOGIN: do NOT force profile page
        router.replace(redirectedFrom);
      } catch (e) {
        console.error("[auth/finish] unexpected error", e);
        router.replace(redirectedFrom);
      }
    })();
  }, [router.isReady, router.query.redirectedFrom, router.query.mode, supabase, user, router]);

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center text-gray-600">
      <p>Setting things up…</p>
    </main>
  );
}
