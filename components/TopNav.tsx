// components/TopNav.tsx
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

// ----------------------
// ADMIN EMAILS (comma-separated)
// NEXT_PUBLIC_ADMIN_EMAILS="a@b.com,c@d.com"
// ----------------------
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export default function TopNav() {
  const supabase = useSupabaseClient();
  const user = useUser(); // null if signed out, object if signed in

  const [firstName, setFirstName] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setFirstName(null);
        return;
      }

      setLoadingProfile(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("TopNav profile load error", error);
      }

      setFirstName((data as any)?.first_name ?? null);
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const displayName =
    firstName && firstName.trim().length > 0
      ? `Hi, ${firstName.trim()}`
      : user?.email ?? null;

  const isAdmin = useMemo(() => isAdminEmail(user?.email ?? null), [user?.email]);

  return (
    <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-3">
        <Link href="/" className="font-semibold">
          myABA.app
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/quiz" className="hover:underline">
            Quizzes
          </Link>

          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="hover:underline font-semibold text-blue-600"
            >
              Admin
            </Link>
          )}

          {!user ? (
            <Link
              href="/login"
              className="rounded-md border px-3 py-1 text-sm flex items-center"
            >
              Sign in
            </Link>
          ) : (
            <>
              <span className="text-sm text-gray-700">
                {loadingProfile ? "Loading…" : displayName}
              </span>
              <button
                onClick={signOut}
                className="rounded-md border px-3 py-1 text-sm"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
