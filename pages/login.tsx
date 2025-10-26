// pages/login.tsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote("");
    setLoading(true);

    try {
      const origin = window.location.origin; // e.g., http://localhost:3000
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        // ✅ For implicit flow, send the user back to the site root (or any public page)
        options: { emailRedirectTo: `${origin}/` },
      });

      if (error) {
        setNote(`❌ ${error.message}`);
      } else {
        setNote(
          "✅ Magic link sent. Open it in the SAME browser you used to request it. If you don't see it, check spam."
        );
      }
    } catch (err: any) {
      setNote(`❌ Unexpected error: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const canSend = email.includes("@") && !loading;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Log in to myABA Study Suite</h1>

      <form onSubmit={send} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
        <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border p-2"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className="w-full rounded bg-blue-600 text-white p-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {note && <p className="mt-4 text-sm text-gray-700">{note}</p>}

      <p className="mt-6 text-xs text-gray-500">
        Tip: In Supabase &rarr; Authentication &rarr; URL Configuration, ensure your{" "}
        <em>Site URL</em> and <em>Redirect URLs</em> include this domain (e.g., {typeof window !== "undefined" ? window.location.origin : "your domain"}).
      </p>
    </main>
  );
}
