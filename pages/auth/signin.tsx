// pages/auth/signin.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

type Mode = "link" | "code";

function safeNext(path?: string | null): string {
  if (!path) return "/quiz"; // default landing
  if (/^https?:\/\//i.test(path) || /^\/\//.test(path)) return "/quiz"; // block external
  return path.startsWith("/") ? path : `/${path}`;
}

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("link");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(""); // 6-digit email code
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const desired = safeNext((router.query.next as string) || "/quiz");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("Sending magic link…");
    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(desired)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });

      if (error) throw error;
      setMsg("Check your email for the magic link.");
    } catch (err: any) {
      setMsg(`Error: ${err?.message || "Failed to send link"}`);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("Verifying code…");
    try {
      // The emailed one-time code uses type "email"
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;

      setMsg("Signed in. Redirecting…");
      router.replace(desired);
    } catch (err: any) {
      setMsg(`Error: ${err?.message || "Invalid code"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

      {/* Mode switcher */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`rounded border px-3 py-1.5 text-sm ${mode === "link" ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
        >
          Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode("code")}
          className={`rounded border px-3 py-1.5 text-sm ${mode === "code" ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
        >
          Enter code
        </button>
      </div>

      {/* Shared email input */}
      <label className="block text-sm font-medium mb-1">Email</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded border px-3 py-2 mb-3"
        autoComplete="email"
      />

      {mode === "link" ? (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <button
            disabled={loading || !email}
            className="rounded border px-3 py-2 w-full text-center hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
          <p className="text-xs text-gray-500">
            You’ll get an email; click the link to finish sign-in.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <label className="block text-sm font-medium">Code from email</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full rounded border px-3 py-2"
            autoComplete="one-time-code"
          />
          <button
            disabled={loading || !email || !code}
            className="rounded border px-3 py-2 w-full text-center hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify & sign in"}
          </button>
          <p className="text-xs text-gray-500">
            Paste the one-time code from your email. We’ll sign you in immediately.
          </p>
        </form>
      )}

      {msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}

      {/* Hint about where they’ll land */}
      <p className="mt-3 text-xs text-gray-500">After sign-in you’ll go to <span className="font-medium">{desired}</span>.</p>
    </main>
  );
}
