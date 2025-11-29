// pages/safmeds/index.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

type Summary = {
  runs: number;
  correct: number;
  incorrect: number;
};

type WeekSummary = Summary;

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

// Same helper we used in trials.tsx
function getTodayLocalYMD(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function SafmedsHome() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<Summary | null>(null);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile (same as Home)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("SAFMEDS profile load error", error);
      }

      setProfile((data as Profile) ?? null);
    };

    loadProfile();
  }, [user, supabase]);

  const fullName =
    (profile?.first_name?.trim() || "") +
    (profile?.last_name ? ` ${profile.last_name.trim()}` : "");

  const fallbackName = (() => {
    if (!user?.email) return "there";
    const local = user.email.split("@")[0] || "";
    const cleaned = local.replace(/[._-]+/g, " ");
    const parts = cleaned
      .split(" ")
      .filter(Boolean)
      .map(
        (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
      );
    return parts.length > 0 ? parts.join(" ") : "there";
  })();

  const displayName =
    fullName.trim().length > 0 ? fullName.trim() : fallbackName;

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const uid = encodeURIComponent(user.id);
        const todayStr = getTodayLocalYMD();

        const [todayRes, weekRes] = await Promise.all([
          fetch(
            `/api/safmeds/today-count?user_id=${uid}&local_day=${todayStr}`
          ),
          fetch(`/api/safmeds/week?user_id=${uid}`),
        ]);

        const todayJson = await todayRes.json();
        const weekJson = await weekRes.json();

        if (!todayJson.ok) {
          setError(todayJson.error ?? "Error loading today stats");
        } else {
          setToday(todayJson.today);
        }

        if (!weekJson.ok) {
          setError(
            (prev) => prev ?? weekJson.error ?? "Error loading week stats"
          );
        } else {
          setWeek(weekJson.week);
        }
      } catch (e: any) {
        console.error("Error loading SAFMEDS summary:", e);
        setError(e?.message ?? "Unknown error loading summary");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-blue-900">
          SAFMEDS Dashboard
        </h1>
        <p className="text-lg text-slate-700">
          Welcome, <span className="font-semibold">{displayName}</span> 👋
        </p>
      </header>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/safmeds/trials"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 shadow-sm"
        >
          ➤ Start New Timings
        </Link>
        <Link
          href="/safmeds/week"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 shadow-sm"
        >
          📈 Show All Runs (Last 7 Days)
        </Link>
        <Link
          href="/safmeds/downloads"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 shadow-sm"
        >
          ⬇ Downloads & Reports
        </Link>
      </nav>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's performance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Today&apos;s Performance
          </h2>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {!loading && today && (
            <div className="space-y-1 text-sm">
              <p>
                Runs:{" "}
                <span className="font-semibold">
                  {today.runs}
                </span>
              </p>
              <p>
                Correct:{" "}
                <span className="font-semibold">
                  {today.correct}
                </span>
              </p>
              <p>
                Incorrect:{" "}
                <span className="font-semibold">
                  {today.incorrect}
                </span>
              </p>
            </div>
          )}
          {!loading && !today && (
            <p className="text-sm text-slate-500">
              No SAFMEDS runs recorded yet for today.
            </p>
          )}
        </div>

        {/* Last 7 days */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Last 7 Days
          </h2>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {!loading && week && (
            <div className="space-y-1 text-sm">
              <p>
                Runs:{" "}
                <span className="font-semibold">
                  {week.runs}
                </span>
              </p>
              <p>
                Correct:{" "}
                <span className="font-semibold">
                  {week.correct}
                </span>
              </p>
              <p>
                Incorrect:{" "}
                <span className="font-semibold">
                  {week.incorrect}
                </span>
              </p>
            </div>
          )}
          {!loading && !week && (
            <p className="text-sm text-slate-500">
              No data yet for the last 7 days.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
