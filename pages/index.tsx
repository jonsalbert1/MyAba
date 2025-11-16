// pages/index.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUserAndProfile() {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      if (cancelled) return;

      setUser(u);

      if (!u) return;

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", u.id)
        .maybeSingle<Profile>(); // 👈 tell TS what this row looks like

      if (cancelled) return;

      if (pErr) {
        console.error("Home profile load error", pErr);
      }

      setProfile(p ?? null);

      // Optional: if they’re logged in but missing name, send to profile page
      const first = p?.first_name?.trim() ?? "";
      const last = p?.last_name?.trim() ?? "";
      if (!first || !last) {
        router.push("/auth/profile");
      }
    }

    loadUserAndProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const fullName =
    (profile?.first_name?.trim() || "") +
    (profile?.last_name ? ` ${profile.last_name.trim()}` : "");

  const greeting =
    user && fullName.trim().length > 0
      ? `Welcome, ${fullName}`
      : user
      ? "Welcome back"
      : "Welcome to myABA Study Suite";

  return (
    <>
      <Head>
        <title>myABA Study Suite | Home</title>
        <meta name="description" content="Choose a section to get started." />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-blue-900">
          {greeting}
        </h1>
        <p className="mt-2 mb-10 text-gray-600">
          Choose a section to get started.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/flashcards"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition"
          >
            <div className="text-xl font-semibold">Flashcards</div>
            <div className="mt-1 text-gray-500">
              Study terms &amp; definitions
            </div>
          </Link>

          <Link
            href="/safmeds"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition"
          >
            <div className="text-xl font-semibold">SAFMEDS</div>
            <div className="mt-1 text-gray-500">Timed fluency practice</div>
          </Link>

          <Link
            href="/quiz"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition"
          >
            <div className="text-xl font-semibold">Quiz</div>
            <div className="mt-1 text-gray-500">Scenario-based MCQs</div>
          </Link>
        </div>
      </main>
    </>
  );
}
