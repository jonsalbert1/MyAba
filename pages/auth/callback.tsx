// pages/auth/callback.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

type Status = "loading" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // 1) If we already have a session, don't try to exchange again
        const { data: sessionRes } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionRes?.session) {
          // Already signed in → just go to home (or /auth/profile if you prefer)
          router.replace("/");
          return;
        }

        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        // 2) If there is no code/state in the URL, it's a stale/used link or direct visit
        if (!code || !state) {
          setStatus("error");
          setMessage(
            "This sign-in link is invalid or has already been used. Please request a new magic link."
          );
          return;
        }

        // 3) Exchange the code for a session (Supabase will read code_verifier from storage)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) return;

        if (error) {
          console.error("Auth callback error:", error);
          setStatus("error");
          setMessage(error.message);
          return;
        }

        if (!data?.session) {
          setStatus("error");
          setMessage("No session returned from Supabase.");
          return;
        }

        // 4) Success → send them to profile to capture name (or straight to / if you prefer)
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
      {status === "loading" ? (
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
            {message ?? "Something went wrong while processing your link."}
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
