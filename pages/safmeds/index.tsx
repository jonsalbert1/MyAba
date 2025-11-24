// pages/safmeds/index.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";

type WeekSummary = {
  total_runs: number;
  total_correct: number;
  total_incorrect: number;
  total_cards: number;
  days_practiced: number;
  decks_count: number;
  first_run?: string | null;
  last_run?: string | null;
};

export default function SafmedsHomePage() {
  const user = useUser();
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const resp = await fetch("/api/safmeds/week-summary", { cache: "no-store" });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
        }
        const json = await resp.json();
        if (cancelled) return;

        if (json?.ok && json.summary) {
          setSummary(json.summary as WeekSummary);
        } else {
          setSummary(null);
          setErrorMsg(json?.error || "No summary available for this week yet.");
        }
      } catch (e: any) {
        if (cancelled) return;
        setSummary(null);
        setErrorMsg(e?.message ?? "Unable to load SAFMEDS summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    (user?.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
    user?.email ||
    "student";

  const hasData = !!summary && summary.total_runs > 0;

  return (
    <>
      <Head>
        <title>SAFMEDS • MyABA</title>
        <meta
          name="description"
          content="Timed SAFMEDS trials with weekly summaries for fluent BCBA prep."
        />
      </Head>

      <main className="mx-auto max-w-4xl p-6">
        {/* Header / welcome */}
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            SAFMEDS
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            Welcome, {displayName}.
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Here’s your week-to-date SAFMEDS summary. When you’re ready, jump in and
            start today’s trials.
          </p>
        </header>

        {/* Start trials CTA */}
        <section className="mb-8">
          <Link
            href="/safmeds/runner"
            className="
              inline-flex items-center justify-center
              rounded-2xl border border-indigo-500 bg-indigo-600
              px-8 py-4 text-lg font-semibold text-white
              shadow-md shadow-indigo-500/30
              hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40
              focus:outline-none focus:ring-2 focus:ring-indigo-500/70
              active:scale-[0.98]
              transition
            "
          >
            Start trials for today
          </Link>
          <p className="mt-2 text-xs text-zinc-500">
            This will open the SAFMEDS runner with your current settings.
          </p>
        </section>

        {/* Week summary card */}
        <section
          className="
            rounded-2xl border bg-white p-6 shadow-sm
            flex flex-col gap-4
          "
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Week-to-date summary
              </h2>
              <p className="text-xs text-zinc-500">
                Based on runs recorded since the start of this week.
              </p>
            </div>
            <Link
              href="/safmeds/week"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              View detailed weekly report →
            </Link>
          </div>

          {loading && (
            <p className="text-sm text-zinc-500">Loading SAFMEDS data…</p>
          )}

          {!loading && errorMsg && (
            <p className="text-sm text-red-600">
              {errorMsg}{" "}
              <span className="text-zinc-500">
                Try running a few trials, then refresh this page.
              </span>
            </p>
          )}

          {!loading && !errorMsg && summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Total runs
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {summary.total_runs}
                </p>
              </div>

              <div className="rounded-xl border bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Correct
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">
                  {summary.total_correct}
                </p>
              </div>

              <div className="rounded-xl border bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Incorrect
                </p>
                <p className="mt-1 text-2xl font-semibold text-rose-700">
                  {summary.total_incorrect}
                </p>
              </div>

              <div className="rounded-xl border bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Total cards
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {summary.total_cards}
                </p>
              </div>

              <div className="rounded-xl border bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Days practiced
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {summary.days_practiced}
                </p>
              </div>

              <div className="rounded-xl border bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Decks used
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {summary.decks_count}
                </p>
              </div>
            </div>
          )}

          {!loading && !errorMsg && !hasData && (
            <p className="text-sm text-zinc-500">
              No SAFMEDS runs logged for this week yet. Click{" "}
              <span className="font-medium">“Start trials for today”</span> above
              to record your first timing.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
