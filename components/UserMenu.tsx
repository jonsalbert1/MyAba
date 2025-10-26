// components/UserMenu.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load current session + subscribe to changes
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mounted) return;

      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);

      // Optional admin probe
      if (session?.user?.id) {
        try {
          const r = await fetch("/api/me", { cache: "no-store" });
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
        fetch("/api/me", { cache: "no-store" })
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
    router.replace("/"); // back to login page (index)
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
        <Link className="text-sm underline" href="/">
          Sign in
        </Link>
      )}
    </div>
  );
}
