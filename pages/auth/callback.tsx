// pages/auth/callback.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const url =
          typeof window !== "undefined" ? window.location.href : "";

        const { data, error } =
          await supabase.auth.exchangeCodeForSession(url);

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

        // ✅ Session stored; go somewhere signed-in only (e.g., Quiz home)
        router.replace("/quiz");
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
          <h1 className="text-xl font-semibold mb-2">Signing you in…</h1>
          <p className="text-gray-600 text-sm">
            Please wait while we confirm your session.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold mb-2">Sign-in error</h1>
          <p className="text-red-600 text-sm mb-3">
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
