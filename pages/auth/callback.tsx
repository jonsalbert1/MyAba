// pages/auth/callback.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const [status, setStatus] = useState<"checking" | "error">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // ✅ In the classic magic-link flow, the session is already set
        const { data, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          console.error("Auth callback getSession error:", error);
          setStatus("error");
          setMessage(error.message);
          return;
        }

        if (!data.session) {
          // No session cookies -> magic link was invalid/expired/wrong browser
          setStatus("error");
          setMessage(
            "No active session was found. Please click your magic link again (in the same browser)."
          );
          return;
        }

        // 🎯 We have a session → go capture profile and then into the app
        router.replace("/auth/profile");
      } catch (e: any) {
        if (cancelled) return;
        console.error("Auth callback exception:", e);
        setStatus("error");
        setMessage(e?.message ?? "Unexpected error processing sign-in.");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      {status === "checking" ? (
        <>
          <h1 className="mb-2 text-xl font-semibold">Signing you in…</h1>
          <p className="text-sm text-gray-600">
            Please wait while we confirm your session.
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-semibold">Sign-in error</h1>
          <p className="mb-3 text-sm text-red-600">
            {message ??
              "Something went wrong while processing your magic link."}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-2 rounded-md border px-4 py-2 text-sm"
          >
            Back to login
          </button>
        </>
      )}
    </main>
  );
}
