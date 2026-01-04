// pages/login.tsx
import Head from "next/head";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

function safeInternalPath(v: unknown) {
  if (typeof v !== "string") return null;
  if (!v.startsWith("/")) return null;
  return v;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const redirectedFrom = useMemo(() => {
    return safeInternalPath(router.query.redirectedFrom) ?? "/";
  }, [router.query.redirectedFrom]);

  // ✅ Default to LOGIN
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, go where they intended (do it in an effect)
  useEffect(() => {
    if (!user) return;
    router.replace(redirectedFrom);
  }, [user, redirectedFrom, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError("Enter your email.");

    if (mode === "signup") {
      const f = first.trim();
      const l = last.trim();
      if (!f || !l) return setError("Enter first and last name to create an account.");

      // Store temporarily so your post-auth step can write profiles + trigger admin email webhook
      localStorage.setItem("myaba_pending_first", f);
      localStorage.setItem("myaba_pending_last", l);
      localStorage.setItem("myaba_pending_email", trimmedEmail);
      localStorage.setItem("myaba_pending_redirect", redirectedFrom);
    } else {
      // Clear any old pending signup data
      localStorage.removeItem("myaba_pending_first");
      localStorage.removeItem("myaba_pending_last");
      localStorage.removeItem("myaba_pending_email");
      localStorage.removeItem("myaba_pending_redirect");
    }

    setLoading(true);

    // ✅ Always redirect back to the same origin the user is currently on
    const origin = window.location.origin;
    const emailRedirectTo =
      `${origin}/auth/callback?redirectedFrom=${encodeURIComponent(redirectedFrom)}&mode=${mode}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo,
        // ✅ Only create user in signup mode
        shouldCreateUser: mode === "signup",
      },
    });

    setLoading(false);

    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <>
      <Head>
        <title>{mode === "signup" ? "Create account" : "Sign in"} | myABA.app</title>
      </Head>

      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold">
          {mode === "signup" ? "Create your account" : "Sign in"}
        </h1>

        <div className="mt-4 flex gap-2 rounded-md border p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded px-3 py-2 text-sm ${
              mode === "login" ? "bg-black text-white" : ""
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded px-3 py-2 text-sm ${
              mode === "signup" ? "bg-black text-white" : ""
            }`}
          >
            Create account
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          We’ll email you a magic link to finish{" "}
          {mode === "signup" ? "creating your account" : "signing in"}.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Magic link sent to <strong>{email}</strong>. Open it in the{" "}
            <strong>same browser</strong>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">First name</label>
                  <input
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm"
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Last name</label>
                  <input
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
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
              className="w-full rounded-md border bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
