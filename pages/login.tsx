// pages/login.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

type Mode = "signin" | "signup";

function safeInternalPath(v: unknown) {
  if (typeof v !== "string") return null;
  if (!v.startsWith("/")) return null;
  return v;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    const rf = safeInternalPath(router.query.redirectedFrom);
    const next = safeInternalPath(router.query.next);
    return rf ?? next ?? "/";
  }, [router.query.redirectedFrom, router.query.next]);

  // If already signed in, get them off /login
  useEffect(() => {
    if (!user) return;
    router.replace(nextPath);
  }, [user, router, nextPath]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    const fn = firstName.trim();
    const ln = lastName.trim();

    if (mode === "signup" && (!fn || !ln)) {
      setError("Please enter your first and last name.");
      return;
    }

    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "";

      if (!origin) {
        setError("Unable to determine redirect URL. Please set NEXT_PUBLIC_SITE_URL.");
        return;
      }

      const emailRedirectTo =
        `${origin}/auth/callback?redirectedFrom=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo,
          // ✅ store name ONLY for signup; callback will copy it into profiles
          ...(mode === "signup"
            ? { data: { first_name: fn, last_name: ln } }
            : {}),
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
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
        <title>{mode === "signup" ? "Create account | myABA.app" : "Sign in | myABA.app"}</title>
      </Head>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6 flex rounded-lg border p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setSent(false);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
              mode === "signin" ? "bg-black text-white" : "text-gray-700"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setSent(false);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
              mode === "signup" ? "bg-black text-white" : "text-gray-700"
            }`}
          >
            Create account
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-semibold">
          {mode === "signup" ? "Create your account" : "Sign in"}
        </h1>

        <p className="mb-4 text-sm text-gray-600">
          {mode === "signup"
            ? "Enter your name and email. We'll send you a magic link to finish creating your account."
            : "Enter your email and we'll send you a magic link to sign in."}
        </p>

        {sent ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Magic link sent to <strong>{email}</strong>. Open the link in the{" "}
            <strong>same browser</strong>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm"
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Email address</label>
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
