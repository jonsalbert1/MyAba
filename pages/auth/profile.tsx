// pages/auth/profile.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { User } from "@supabase/supabase-js";

function safeInternalPath(v: unknown) {
  if (typeof v !== "string") return null;
  if (!v.startsWith("/")) return null;
  return v;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const redirectTarget = useMemo(() => {
    const rf = safeInternalPath(router.query.redirectedFrom);
    const next = safeInternalPath(router.query.next);
    return rf ?? next ?? "/";
  }, [router.query.redirectedFrom, router.query.next]);

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Don't trust useUser hydration. Do a real auth check once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(data.user ?? null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ✅ After auth check, if signed out -> redirect to login
  useEffect(() => {
    if (!authChecked) return;

    if (!user) {
      setLoading(false);
      router.replace(
        `/login?redirectedFrom=${encodeURIComponent(redirectTarget)}`
      );
      return;
    }
  }, [authChecked, user, router, redirectTarget]);

  // Load existing profile (if any)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!authChecked || !user) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("id", user.id)
          .maybeSingle();

        if (error) console.error("Profile load error", error);

        if (!cancelled && profile) {
          setFirstName(profile.first_name ?? "");
          setLastName(profile.last_name ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecked, user, supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);

    const first = firstName.trim();
    const last = lastName.trim();

    if (!first || !last) {
      setError("Please enter both first and last name.");
      return;
    }

    setSaving(true);

    try {
      // ✅ Try UPDATE first (fires UPDATE webhook)
      const { data: updatedRows, error: updateErr } = await supabase
        .from("profiles")
        .update({ first_name: first, last_name: last })
        .eq("id", user.id)
        .select("id");

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      // If no row existed to update, fall back to UPSERT (so user isn't blocked)
      if (!updatedRows || updatedRows.length === 0) {
        const { error: upsertErr } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email ?? null,
          first_name: first,
          last_name: last,
        });

        if (upsertErr) {
          setError(upsertErr.message);
          return;
        }
      }

      router.push(redirectTarget);
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || loading) {
    return (
      <main className="p-6 max-w-md mx-auto text-gray-500">
        Loading profile…
      </main>
    );
  }

  // Signed-out handled via redirect
  if (!user) return null;

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Complete your profile</h1>
      <p className="text-sm text-gray-600 mb-4">Please add your name to continue.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            autoComplete="given-name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            autoComplete="family-name"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md border bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </main>
  );
}
