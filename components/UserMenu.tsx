// components/UserMenu.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

// Admin emails from env
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export default function UserMenu() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser(); // comes from SessionContextProvider
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load first_name from profiles for greeting
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setFirstName(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) {
          if (!error) {
            setFirstName(data?.first_name ?? null);
          } else {
            console.warn("UserMenu profile load error", error);
            setFirstName(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("UserMenu profile load exception", e);
          setFirstName(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const displayName =
    firstName && firstName.trim().length > 0
      ? `Hi, ${firstName.trim()}`
      : user?.email ?? "";

  const isAdmin = isAdminEmail(user?.email);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out error", e);
    } finally {
      router.push("/");
    }
  }

  function handleSignIn() {
    router.push("/login");
  }

  // Not signed in → show Sign in
  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="rounded-md border px-3 py-1 text-sm"
      >
        Sign in
      </button>
    );
  }

  // Signed in → greeting, optional Admin, and Sign out
  return (
    <div className="flex items-center gap-3 text-sm">
      {loading ? (
        <span className="text-gray-500">Loading…</span>
      ) : (
        displayName && <span className="text-gray-700">{displayName}</span>
      )}

      {isAdmin && (
        <Link href="/admin" className="text-blue-600 hover:underline">
          Admin
        </Link>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border px-3 py-1 text-sm"
      >
        Sign out
      </button>
    </div>
  );
}
