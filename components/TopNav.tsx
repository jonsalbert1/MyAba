import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TopNav() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) alert(error.message);
  }
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-3">
        <Link href="/" className="font-semibold">myABA.app</Link>
        <div className="flex items-center gap-4">
          <Link href="/quiz" className="hover:underline">Quizzes</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          {email ? (
            <>
              <span className="text-sm text-gray-600">{email}</span>
              <button onClick={signOut} className="rounded-md border px-3 py-1 text-sm">Sign out</button>
            </>
          ) : (
            <button onClick={signIn} className="rounded-md border px-3 py-1 text-sm">Sign in</button>
          )}
        </div>
      </nav>
    </header>
  );
}
