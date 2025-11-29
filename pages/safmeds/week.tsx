// pages/safmeds/week.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* =========================
   Types
========================= */

type SafmedsRun = {
  id: string;
  user_id: string;
  local_day: string; // "YYYY-MM-DD"
  local_ts: string | null;
  correct: number;
  incorrect: number;
  net_score: number | null;
  duration_seconds: number | null;
  deck: string | null;
  notes: string | null;
};

type DaySummary = {
  date: string; // "YYYY-MM-DD"
  runs: SafmedsRun[];
  totalCorrect: number;
  totalIncorrect: number;
  bestNet: number;
};

type ChartPoint = {
  run_number: number;
  net_score: number;
  correct: number;
  incorrect: number;
};

/* =========================
   Date helpers (local, no UTC shift)
========================= */

function getTodayLocalYMD(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getYmdNDaysAgo(n: number): string {
  const now = new Date();
  now.setDate(now.getDate() - n);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate() + 0).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================
   Name helper (email fallback)
========================= */

function prettifyFromEmail(email?: string | null): string {
  if (!email) return "User";
  const prefix = email.split("@")[0] ?? "";

  const sepParts = prefix.split(/[._\-\s]+/).filter(Boolean);

  let words: string[];
  if (sepParts.length >= 2) {
    words = sepParts;
  } else {
    const raw = sepParts[0] ?? prefix;
    if (raw.length > 4) {
      const mid = Math.floor(raw.length / 2);
      words = [raw.slice(0, mid), raw.slice(mid)];
    } else {
      words = [raw];
    }
  }

  const nice = words
    .filter(Boolean)
    .map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");

  return nice || "User";
}

/* =========================
   Component
========================= */

export default function SafmedsWeek() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [downloading, setDownloading] = useState(false);

  const [profileName, setProfileName] = useState<string | null>(null);

  const todayYmd = getTodayLocalYMD();
  const startYmd = getYmdNDaysAgo(6); // last 7 calendar days inclusive

  /* =========================
     Load profile name (first_name + last_name from profiles)
  ========================== */
  useEffect(() => {
    if (!user) {
      setProfileName(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (error) {
          // Don't hard-fail; just fall back to email
          console.warn("profiles fetch error:", error);
          if (!cancelled) setProfileName(null);
          return;
        }

        const first = (data as any)?.first_name?.trim() ?? "";
        const last = (data as any)?.last_name?.trim() ?? "";
        const full = [first, last].filter(Boolean).join(" ");

        if (!cancelled) {
          setProfileName(full || null);
        }
      } catch (e) {
        console.warn("profiles fetch exception:", e);
        if (!cancelled) setProfileName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  const displayName =
    profileName || prettifyFromEmail(user?.email);

  /* =========================
     Load data for last 7 days
  ========================== */
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("safmeds_runs")
          .select("*")
          .eq("user_id", user.id)
          .gte("local_day", startYmd)
          .lte("local_day", todayYmd)
          .order("local_day", { ascending: false }) // newest day first
          .order("local_ts", { ascending: true });

        if (error) throw error;

        const runs = (data ?? []) as SafmedsRun[];

        const byDay = new Map<string, SafmedsRun[]>();
        for (const r of runs) {
          const key = r.local_day;
          if (!byDay.has(key)) byDay.set(key, []);
          byDay.get(key)!.push(r);
        }

        const summaries: DaySummary[] = Array.from(byDay.entries())
          .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0)) // newest first
          .map(([date, dayRuns]) => {
            const totalCorrect = dayRuns.reduce(
              (sum, r) => sum + r.correct,
              0
            );
            const totalIncorrect = dayRuns.reduce(
              (sum, r) => sum + r.incorrect,
              0
            );
            const bestNet =
              dayRuns.length === 0
                ? 0
                : Math.max(
                    ...dayRuns.map((r) =>
                      r.net_score != null
                        ? r.net_score
                        : r.correct - r.incorrect
                    )
                  );
            return {
              date,
              runs: dayRuns,
              totalCorrect,
              totalIncorrect,
              bestNet,
            };
          });

        setDays(summaries);
      } catch (e: any) {
        setError(e.message ?? "Error loading weekly SAFMEDS data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase, user?.id, startYmd, todayYmd]);

  /* =========================
     Shared helper: best-of-5 in *run order*
     Returns runs extended with .net
  ========================== */
  function getBestRunsForDay(
    day: DaySummary
  ): (SafmedsRun & { net: number })[] {
    if (!day.runs.length) return [];

    // add net
    const withNet = day.runs.map((r) => ({
      ...r,
      net:
        r.net_score != null
          ? r.net_score
          : r.correct - r.incorrect,
    }));

    // chronological
    const chrono = withNet.slice().sort((a, b) => {
      if (a.local_ts && b.local_ts) {
        const ta = new Date(a.local_ts).getTime();
        const tb = new Date(b.local_ts).getTime();
        if (ta !== tb) return ta - tb;
      }
      return a.id.localeCompare(b.id);
    });

    // if 5 or fewer runs, just return all in order
    if (chrono.length <= 5) return chrono;

    // otherwise select best 5 by net, then keep run order among those
    const bestFiveIds = new Set(
      withNet
        .slice()
        .sort((a, b) => b.net - a.net)
        .slice(0, 5)
        .map((r) => r.id)
    );

    return chrono.filter((r) => bestFiveIds.has(r.id));
  }

  /* =========================
     Build chart data per day
     - BEST OF 5, but in the *order performed*
  ========================== */
  function buildChartData(day: DaySummary): ChartPoint[] {
    const bestRuns = getBestRunsForDay(day);
    return bestRuns.map((r, idx) => ({
      run_number: idx + 1,
      net_score: r.net,
      correct: r.correct,
      incorrect: r.incorrect,
    }));
  }

  /* =========================
     Download weekly report (PDF via jsPDF, with mini graphs)
  ========================== */
  async function handleDownloadPdf() {
    if (!days.length) return;

    try {
      setDownloading(true);

      const jsPdfModule = await import("jspdf");
      const { jsPDF } = jsPdfModule;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });

      const marginLeft = 40;
      const marginTop = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = marginTop;

      // Title + user
      doc.setFontSize(18);
      doc.text("SAFMEDS Weekly Report (Last 7 Days)", marginLeft, y);
      y += 22;

      doc.setFontSize(11);
      doc.text(`Report for: ${displayName}`, marginLeft, y);
      y += 16;

      doc.setFontSize(10);
      doc.text(`Date range: ${startYmd} to ${todayYmd}`, marginLeft, y);
      y += 20;

      // One section per day
      days.forEach((day, index) => {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = marginTop;
        }

        doc.setFontSize(13);
        doc.text(
          `${day.date} — ${day.runs.length} trial${
            day.runs.length === 1 ? "" : "s"
          }`,
          marginLeft,
          y
        );
        y += 14;

        doc.setFontSize(10);
        doc.text(
          `Total correct: ${day.totalCorrect}   ·   Total incorrect: ${day.totalIncorrect}   ·   Best net: ${day.bestNet}`,
          marginLeft,
          y
        );
        y += 14; // a bit more space before graph

        // --- Mini graph: best-of-5, in order performed ---
        const bestRuns = getBestRunsForDay(day);
        const chartData = bestRuns.map((r, idx) => ({
          run_number: idx + 1,
          net_score: r.net,
          correct: r.correct,
          incorrect: r.incorrect,
        }));

        const chartHeight = 70;
        const chartWidth = pageWidth - marginLeft * 2;
        const chartLeft = marginLeft;
        let chartTop = y + 10; // move graph further down

        if (chartData.length && chartTop + chartHeight > pageHeight - 60) {
          doc.addPage();
          y = marginTop;
          chartTop = y + 10;
        }

        if (chartData.length) {
          const nets = chartData.map((p) => p.net_score);
          let minNet = Math.min(...nets);
          let maxNet = Math.max(...nets);
          if (minNet === maxNet) {
            minNet -= 1;
            maxNet += 1;
          }

          const n = chartData.length;
          const xOf = (i: number) =>
            n === 1
              ? chartLeft + chartWidth / 2
              : chartLeft + (chartWidth * i) / (n - 1);
          const yOf = (v: number) => {
            const t = (v - minNet) / (maxNet - minNet || 1);
            return chartTop + chartHeight - t * chartHeight;
          };

          // axes
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.5);
          doc.line(
            chartLeft,
            chartTop + chartHeight,
            chartLeft + chartWidth,
            chartTop + chartHeight
          );
          doc.line(
            chartLeft,
            chartTop,
            chartLeft,
            chartTop + chartHeight
          );

          // line + points
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1);

          chartData.forEach((pt, idx) => {
            const x = xOf(idx);
            const yVal = yOf(pt.net_score);
            if (idx > 0) {
              const prev = chartData[idx - 1];
              const px = xOf(idx - 1);
              const py = yOf(prev.net_score);
              doc.line(px, py, x, yVal);
            }
            doc.circle(x, yVal, 2, "F");
          });

          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.text(
            `Net score (best ${chartData.length} runs, in order completed)`,
            chartLeft,
            chartTop - 4
          );
          doc.setTextColor(0);
        } else {
          doc.setFontSize(9);
          doc.text(
            "No runs this day (no graph).",
            marginLeft,
            chartTop + 20
          );
        }

        // Move y below graph
        y = chartTop + chartHeight + 16; // a bit more space before table

        // --- Table header ---
        if (y > pageHeight - 60) {
          doc.addPage();
          y = marginTop;
        }

        doc.setFontSize(9);
        const headerY = y;
        const colRun = marginLeft;
        const colCorrect = marginLeft + 40;
        const colIncorrect = marginLeft + 100;
        const colNet = marginLeft + 170;
        const colDur = marginLeft + 220;
        const colDeck = marginLeft + 270;

        doc.text("Run", colRun, headerY);
        doc.text("Correct", colCorrect, headerY);
        doc.text("Incorrect", colIncorrect, headerY);
        doc.text("Net", colNet, headerY);
        doc.text("Dur(s)", colDur, headerY);
        doc.text("Deck", colDeck, headerY);
        y += 10;

        // Table rows — SAME subset & order as graph (best-of-5 in run order)
        const tableRuns = bestRuns;

        tableRuns.forEach((run, idx) => {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = marginTop;
          }

          const net = run.net;

          doc.text(String(idx + 1), colRun, y);
          doc.text(String(run.correct), colCorrect, y);
          doc.text(String(run.incorrect), colIncorrect, y);
          doc.text(String(net), colNet, y);
          doc.text(
            run.duration_seconds != null
              ? String(run.duration_seconds)
              : "-",
            colDur,
            y
          );

          const deckLabel = run.deck ?? "";
          doc.text(
            deckLabel.length > 30
              ? deckLabel.slice(0, 27) + "..."
              : deckLabel,
            colDeck,
            y
          );

          y += 10;
        });

        // --- Divider between days in PDF ---
        if (index < days.length - 1) {
          if (y > pageHeight - 60) {
            doc.addPage();
            y = marginTop;
          }
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.4);
          doc.line(marginLeft, y + 10, pageWidth - marginLeft, y + 10);
          y += 32;
        } else {
          y += 18;
        }
      });

      doc.save(`safmeds_weekly_report_${todayYmd}.pdf`);
    } catch (e) {
      console.error("PDF download error", e);
      alert("Sorry, there was a problem generating the PDF.");
    } finally {
      setDownloading(false);
    }
  }

  /* =========================
     Render
  ========================== */

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-4 space-y-2">
        <h1 className="text-3xl font-bold">
          SAFMEDS — Last 7 Days of Runs
        </h1>
        <p className="text-sm text-slate-600">
          Showing runs for the last 7 calendar days, based on your{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
            local_day
          </code>{" "}
          field.
        </p>
      </header>

      <nav className="mb-4 flex flex-wrap gap-4 text-sm">
        <Link href="/safmeds" className="underline text-slate-700">
          ← SAFMEDS Home
        </Link>
        <Link href="/safmeds/trials" className="underline text-slate-700">
          Timings / Run SAFMEDS
        </Link>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading || days.length === 0}
          className="rounded border border-slate-300 px-3 py-1 text-slate-700 disabled:opacity-50"
        >
          {downloading
            ? "Preparing PDF…"
            : "Download weekly report (PDF v2)"}
        </button>
      </nav>

      {loading && (
        <p className="text-sm text-slate-600">Loading weekly data…</p>
      )}
      {error && (
        <p className="text-sm text-red-600">
          Error loading data: {error}
        </p>
      )}

      {!loading && !error && days.length === 0 && (
        <p className="text-sm text-slate-600">
          No SAFMEDS runs recorded in the last 7 days.
        </p>
      )}

      <div className="space-y-20 mt-10">
        {days.map((day, idx) => {
          const chartData = buildChartData(day);
          return (
            <div key={day.date}>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <header className="mb-2 flex items-baseline gap-3">
                  <h2 className="text-xl font-semibold">
                    {day.date} — {day.runs.length} trial
                    {day.runs.length === 1 ? "" : "s"}
                  </h2>
                </header>
                <p className="mb-3 text-sm text-slate-700">
                  Total correct:{" "}
                  <span className="font-semibold">
                    {day.totalCorrect}
                  </span>{" "}
                  · Total incorrect:{" "}
                  <span className="font-semibold">
                    {day.totalIncorrect}
                  </span>{" "}
                  · Best net:{" "}
                  <span className="font-semibold">
                    {day.bestNet}
                  </span>
                </p>

                {/* Line chart: best-of-5 in order performed */}
                <div className="h-72 w-full rounded-xl border bg-white p-3">
                  {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      No runs for this day.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="run_number"
                          label={{
                            value:
                              "Best 5 runs (in order completed)",
                            position: "insideBottom",
                            offset: -5,
                          }}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any, name: any) => {
                            if (name === "net_score") return [value, "Net"];
                            if (name === "correct") return [value, "✓"];
                            if (name === "incorrect") return [value, "✕"];
                            return [value, name];
                          }}
                          labelFormatter={(label) =>
                            `Run #${label}`
                          }
                        />
                        <Line
                          type="linear"
                          dataKey="net_score"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              {idx < days.length - 1 && (
                <hr className="my-10 border-t-4 border-slate-800 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
