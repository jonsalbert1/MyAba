// components/TopNav.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

// ----------------------
// ADMIN EMAILS
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
  // user === undefined -> still checking
  // user === null      -> definitely signed out
  // user (object)      -> signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 🔹 this is the same call that worked on /auth/profile
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error) {
        console.error("TopNav getUser error", error);
      }

      const u = data.user ?? null;
      setUser(u);

      if (u) {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", u.id)
          .maybeSingle();

        if (pErr) {
          console.error("TopNav profile load error", pErr);
        }

        if (!cancelled) {
          const profile = p as { first_name?: string | null } | null;
          setFirstName(profile?.first_name ?? null);
        }
      }
    }

    bootstrap();

    // 🔹 Listen for login / logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        supabase
          .from("profiles")
          .select("first_name")
          .eq("id", u.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error("TopNav profile load error (change)", error);
            }
            const profile = data as { first_name?: string | null } | null;
            setFirstName(profile?.first_name ?? null);
          });
      } else {
        setFirstName(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const displayName =
    firstName && firstName.trim().length > 0
      ? `Hi, ${firstName.trim()}`
      : user
      ? user.email
      : null;

  const isAdmin = isAdminEmail(user?.email ?? null);

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

          {user === undefined ? (
            <span className="text-sm text-gray-600">Loading…</span>
          ) : user ? (
            <>
              <span className="text-sm text-gray-700">{displayName}</span>
              <button
                onClick={signOut}
                className="rounded-md border px-3 py-1 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md border px-3 py-1 text-sm flex items-center"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
