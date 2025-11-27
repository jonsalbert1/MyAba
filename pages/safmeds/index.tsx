// pages/safmeds/index.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

type Summary = {
  runs: number;
  correct: number;
  incorrect: number;
};

type SafmedsRun = {
  correct: number | null;
  incorrect: number | null;
  created_at: string;
};

export default function SafmedsHome() {
  const user = useUser();
  const supabase = useSupabaseClient();

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

        // Pull a chunk of recent runs for THIS user
        const { data, error } = await supabase
          .from("safmeds_runs")
          .select("correct, incorrect, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) {
          console.error("SAFMEDS home supabase error:", error);
          setError(error.message);
          setToday(null);
          setWeek(null);
          return;
        }

        const rows = (data ?? []) as SafmedsRun[];

        if (!rows.length) {
          setToday(null);
          setWeek(null);
          return;
        }

        const now = new Date();

        // "today" window in local time
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endOfToday = new Date(
          startOfToday.getTime() + 24 * 60 * 60 * 1000
        );

        // last 7 days window
        const sevenDaysAgo = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        );

        const todaySummary: Summary = { runs: 0, correct: 0, incorrect: 0 };
        const weekSummary: Summary = { runs: 0, correct: 0, incorrect: 0 };

        for (const row of rows) {
          const created = new Date(row.created_at);
          const c = row.correct ?? 0;
          const ic = row.incorrect ?? 0;

          // Last 7 days
          if (created >= sevenDaysAgo && created <= now) {
            weekSummary.runs += 1;
            weekSummary.correct += c;
            weekSummary.incorrect += ic;
          }

          // Today
          if (created >= startOfToday && created < endOfToday) {
            todaySummary.runs += 1;
            todaySummary.correct += c;
            todaySummary.incorrect += ic;
          }
        }

        setToday(todaySummary.runs > 0 ? todaySummary : null);
        setWeek(weekSummary.runs > 0 ? weekSummary : null);
      } catch (e: any) {
        console.error("Error loading SAFMEDS summary:", e);
        setError(e?.message ?? "Unknown error loading summary");
        setToday(null);
        setWeek(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, supabase]);

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
          href="/safmeds/week"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          📈 Show All Runs (Last 7 Days)
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
              <p>
                Runs: <span className="font-semibold">{today.runs}</span>
              </p>
              <p>
                Correct:{" "}
                <span className="font-semibold">{today.correct}</span>
              </p>
              <p>
                Incorrect:{" "}
                <span className="font-semibold">{today.incorrect}</span>
              </p>
            </div>
          )}
          {!loading && !today && (
            <p className="text-sm text-slate-500">
              No SAFMEDS runs recorded yet for today.
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
              <p>
                Runs: <span className="font-semibold">{week.runs}</span>
              </p>
              <p>
                Correct:{" "}
                <span className="font-semibold">{week.correct}</span>
              </p>
              <p>
                Incorrect:{" "}
                <span className="font-semibold">{week.incorrect}</span>
              </p>
            </div>
          )}
          {!loading && !week && (
            <p className="text-sm text-slate-500">
              No SAFMEDS runs in the last 7 days.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
