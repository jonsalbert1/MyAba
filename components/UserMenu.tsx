// components/UserMenu.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Strongly type the profile row
type ProfileRow = {
  first_name: string | null;
  is_admin: boolean | null;
};

export default function UserMenu() {
  const supabase = useSupabaseClient<SupabaseClient>();
  const user = useUser();

  const [firstName, setFirstName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load first_name + is_admin from profiles when we have a user
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setFirstName(null);
        setIsAdmin(false);
        return;
      }

      setLoadingProfile(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name,is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("UserMenu profile load error", error);
      }

      const row = (data as ProfileRow | null) ?? null;
      setFirstName(row?.first_name ?? null);
      setIsAdmin(Boolean(row?.is_admin));
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  const displayName =
    firstName && firstName.trim().length > 0
      ? `Hi, ${firstName.trim()}`
      : user?.email ?? null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // -------------------------------
  // Render
  // -------------------------------
  if (user === null) {
    // Signed OUT
    return (
      <Link
        href="/login"
        className="rounded-md border px-3 py-1 text-sm flex items-center"
      >
        Sign in
      </Link>
    );
  }

  if (user === undefined) {
    // Hydrating / checking session
    return <span className="text-sm text-gray-600">Loading…</span>;
  }

  // Signed IN
  return (
    <div className="flex items-center gap-3 text-sm">
      {isAdmin && (
        <Link
          href="/admin"
          className="rounded-md border border-blue-500 px-2 py-0.5 text-xs font-semibold text-blue-700"
        >
          Admin
        </Link>
      )}

      <span className="text-gray-700">
        {loadingProfile ? "Hi…" : displayName ?? "Hi there"}
      </span>

      <button
        onClick={handleSignOut}
        className="rounded-md border px-3 py-1 text-sm"
      >
        Sign out
      </button>
    </div>
  );
}
