// pages/login.tsx
import { FormEvent, useState } from "react";
import Head from "next/head";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function LoginPage() {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      // Prefer window.origin, fall back to env (for safety)
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "";

      if (!origin) {
        setError(
          "Unable to determine redirect URL. Please set NEXT_PUBLIC_SITE_URL."
        );
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback`, // magic link target
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
        // ✅ No admin email, no signup notify
        // Magic link auth only
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign in | myABA.app</title>
      </Head>

      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        <p className="mb-4 text-sm text-gray-600">
          Enter your email and we&apos;ll send you a magic link to sign in.
          Open the link in the <strong>same browser</strong> as this page.
        </p>

        {sent ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Magic link sent to <strong>{email}</strong>. Check your inbox and
            click the link to finish signing in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md border bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Sending magic link…" : "Send magic link"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
