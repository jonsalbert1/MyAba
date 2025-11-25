// pages/safmeds/index.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";

type Summary = {
  runs: number;
  correct: number;
  incorrect: number;
};

export default function SafmedsHome() {
  const user = useUser();
  const [today, setToday] = useState<Summary | null>(null);
  const [week, setWeek] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const uid = encodeURIComponent(user.id);

        const [todayRes, weekRes] = await Promise.all([
          fetch(`/api/safmeds/today-count?user_id=${uid}`),
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
          setError((prev) => prev ?? weekJson.error ?? "Error loading week stats");
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

  const displayName =
    (user?.user_metadata as any)?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">SAFMEDS Dashboard</h1>
        <p className="text-slate-600">
          Welcome, <span className="font-semibold">{displayName}</span> 👋
        </p>
      </header>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/safmeds/trials"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          ➤ Start New Timings
        </Link>
        <Link
          href="/safmeds/downloads"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
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
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Today&apos;s Performance
          </h2>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {!loading && today && (
            <div className="space-y-1 text-sm">
              <p>Runs: <span className="font-semibold">{today.runs}</span></p>
              <p>Correct: <span className="font-semibold">{today.correct}</span></p>
              <p>Incorrect: <span className="font-semibold">{today.incorrect}</span></p>
            </div>
          )}
          {!loading && !today && (
            <p className="text-sm text-slate-500">
              No data for today yet. Start a timing to begin.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Last 7 Days
          </h2>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {!loading && week && (
            <div className="space-y-1 text-sm">
              <p>Runs: <span className="font-semibold">{week.runs}</span></p>
              <p>Correct: <span className="font-semibold">{week.correct}</span></p>
              <p>Incorrect: <span className="font-semibold">{week.incorrect}</span></p>
            </div>
          )}
          {!loading && !week && (
            <p className="text-sm text-slate-500">
              No data for this week yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
