// components/UserMenu.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Build a safe ?next= param for sign-in
  const signinHref = useMemo(() => {
    // Prefer full asPath (includes query) and ensure it starts with "/"
    const path = typeof router.asPath === "string" && router.asPath.startsWith("/")
      ? router.asPath
      : "/";
    const next = encodeURIComponent(path);
    return `/auth/signin?next=${next}`;
  }, [router.asPath]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);

      if (session?.user?.id) {
        try {
          const r = await fetch("/api/me?debug=0", { cache: "no-store" });
          const j = await r.json().catch(() => ({}));
          setIsAdmin(Boolean(j?.profile?.is_admin));
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);
      if (session?.user?.id) {
        fetch("/api/me?debug=0", { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => setIsAdmin(Boolean(j?.profile?.is_admin)))
          .catch(() => setIsAdmin(false));
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setIsAdmin(false);
    router.replace("/"); // back to home
  };

  return (
    <div className="flex items-center gap-4">
      {isAdmin && (
        <Link href="/admin" className="text-sm hover:underline">
          Admin
        </Link>
      )}

      {email ? (
        <>
          <span className="text-sm text-gray-700">{email}</span>
          <button className="text-sm underline" onClick={signOut}>
            Sign out
          </button>
        </>
      ) : (
        // ✅ FIX: point to the actual sign-in page and preserve the intended destination
        <Link className="text-sm underline" href={signinHref}>
          Sign in
        </Link>
      )}
    </div>
  );
}
