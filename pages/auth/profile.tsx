// pages/auth/profile.tsx
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser(); // session-aware from SessionContextProvider

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // If auth is settled and there's no user, send to login
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Profile load error", error);
        }

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
  }, [supabase, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    // back to home
    router.push("/");
  }

  if (loading) {
    return (
      <main className="p-6 max-w-md mx-auto text-gray-500">
        Loading profile…
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Complete your profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md border px-4 py-2 text-sm font-semibold"
        >
          {saving ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </main>
  );
}
