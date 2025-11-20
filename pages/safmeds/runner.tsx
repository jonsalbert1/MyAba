// pages/safmeds.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@supabase/auth-helpers-react";
import SafmedsMobile from "@/components/SafmedsMobile";

export default function SafmedsPage() {
  const user = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for session/user to hydrate
    if (user !== undefined) {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-gray-600">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="mb-4 text-3xl font-bold">SAFMEDS</h1>
        <p className="mb-3 text-lg">Please sign in to start a SAFMEDS timing.</p>
        <p className="mb-6 text-gray-600">
          All fluency data is private and tied to your account only.
        </p>
        <Link
          href="/login"
          className="rounded-md border px-4 py-2 text-sm font-semibold"
        >
          Sign in
        </Link>
      </main>
    );
  }

  // ---------- AUTHENTICATED SAFMEDS UI ----------
  return (
    <main className="mx-auto max-w-screen-sm px-3 pb-10 pt-4 sm:px-4">
      <h1 className="mb-4 text-2xl font-semibold">SAFMEDS Timing</h1>
      <p className="mb-4 text-sm text-gray-600">
        You are signed in as <strong>{user.email}</strong>. Runs are saved per day
        so you can track best-of-day performance.
      </p>

      <SafmedsMobile deckName="General ABA Terms" />
    </main>
  );
}
