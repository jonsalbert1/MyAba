// pages/safmeds/week.tsx
import { useEffect, useState } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type WeeklySummary = {
  user_id: string;
  week_start: string; // we'll treat this as the earliest day we see
  total_trials: number;
  avg_correct: number;
  avg_attempted: number;
  avg_accuracy: number;
  best_correct: number;
  best_accuracy: number;
};

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

export default function SafmedsWeekPage() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null
  );
  const [runsByDay, setRunsByDay] = useState<Record<string, SafmedsRun[]>>({});

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const loadRuns = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔹 Pull recent runs for this user — no date filter so we SEE data
        const { data: runRows, error: runsErr } = await supabase
          .from("safmeds_runs")
          .select("*")
          .eq("user_id", user.id)
          .order("local_day", { ascending: true })
          .order("local_ts", { ascending: true })
          .limit(200); // plenty for recent weeks

        if (runsErr) throw runsErr;

        const rows = (runRows ?? []) as SafmedsRun[];

        if (!rows.length) {
          setWeeklySummary(null);
          setRunsByDay({});
          setLoading(false);
          return;
        }

        // Group by local_day
        const byDay: Record<string, SafmedsRun[]> = {};
        rows.forEach((run) => {
          if (!byDay[run.local_day]) byDay[run.local_day] = [];
          byDay[run.local_day].push(run);
        });
        setRunsByDay(byDay);

        // Compute summary across all these runs (effectively a "recent week")
        const total_trials = rows.length;

        let totalCorrect = 0;
        let totalAttempts = 0;
        let best_correct = 0;
        let best_accuracy = 0;

        rows.forEach((run) => {
          const c = run.correct ?? 0;
          const ic = run.incorrect ?? 0;
          const attempts = c + ic;

          totalCorrect += c;
          totalAttempts += attempts;

          if (c > best_correct) {
            best_correct = c;
          }

          if (attempts > 0) {
            const acc = (c / attempts) * 100;
            if (acc > best_accuracy) best_accuracy = acc;
          }
        });

        const dayKeys = Object.keys(byDay).sort(); // earliest first for summary
        const earliestDay = dayKeys[0];

        const avg_correct =
          total_trials > 0 ? totalCorrect / total_trials : 0;
        const avg_attempted =
          total_trials > 0 ? totalAttempts / total_trials : 0;
        const avg_accuracy =
          totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

        const summary: WeeklySummary = {
          user_id: user.id as string,
          week_start: earliestDay,
          total_trials,
          avg_correct,
          avg_attempted,
          avg_accuracy,
          best_correct,
          best_accuracy,
        };

        setWeeklySummary(summary);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error loading SAFMEDS data");
        setLoading(false);
      }
    };

    loadRuns();
  }, [user, supabase, router]);

  const handleDownloadCsv = () => {
    if (!weeklySummary) return;

    const days = Object.keys(runsByDay);
    if (days.length === 0) return;

    const header = [
      "week_start",
      "local_day",
      "trial_number",
      "correct",
      "incorrect",
      "net_score",
      "duration_seconds",
      "deck",
      "notes",
      "timestamp",
    ].join(",");

    const rows: string[] = [];

    days.sort().forEach((day) => {
      const runs = runsByDay[day];
      runs.forEach((run, idx) => {
        const netScore =
          run.net_score != null
            ? run.net_score
            : (run.correct ?? 0) - (run.incorrect ?? 0);

        rows.push(
          [
            weeklySummary.week_start,
            day,
            idx + 1,
            run.correct,
            run.incorrect,
            netScore,
            run.duration_seconds ?? "",
            (run.deck ?? "").replace(/,/g, " "),
            (run.notes ?? "").replace(/,/g, " "),
            run.local_ts ?? "",
          ].join(",")
        );
      });
    });

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safmeds_recent_${weeklySummary.week_start.replace(
      /-/g,
      ""
    )}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!weeklySummary) return;

    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");

      const marginLeft = 12;
      let y = 14;
      const lineHeight = 6;
      const pageHeight = doc.internal.pageSize.getHeight() - 10;

      const addLine = (text = "", options?: { bold?: boolean }) => {
        if (y > pageHeight) {
          doc.addPage();
          y = 14;
        }
        if (options?.bold) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
        }
        doc.text(text, marginLeft, y);
        y += lineHeight;
      };

      const weekStr = weeklySummary.week_start;
      const dayKeys = Object.keys(runsByDay).sort();

      // Title
      doc.setFontSize(14);
      addLine(`SAFMEDS Report — Starting ${weekStr}`, { bold: true });
      doc.setFontSize(11);
      addLine();

      // Summary
      addLine("Summary", { bold: true });
      addLine(`Total trials: ${weeklySummary.total_trials}`);
      addLine(
        `Average correct: ${weeklySummary.avg_correct.toFixed(
          1
        )} | Average attempted: ${weeklySummary.avg_attempted.toFixed(1)}`
      );
      addLine(`Average accuracy: ${weeklySummary.avg_accuracy.toFixed(1)}%`);
      addLine(
        `Best single trial: ${weeklySummary.best_correct} correct (${weeklySummary.best_accuracy.toFixed(
          1
        )}%)`
      );
      addLine();

      if (dayKeys.length === 0) {
        addLine("No trials recorded in this dataset.");
      } else {
        dayKeys.forEach((day) => {
          const runs = runsByDay[day];

          addLine(`Day: ${day}`, { bold: true });
          addLine(`Trials: ${runs.length}`);

          // Simple chart data
          const chartData = runs.map((run, idx) => {
            const netScore =
              run.net_score != null
                ? run.net_score
                : (run.correct ?? 0) - (run.incorrect ?? 0);
            return {
              trial_number: idx + 1,
              net_score: netScore,
            };
          });

          // Draw mini chart
          const chartHeight = 40;
          const pageWidth = doc.internal.pageSize.getWidth();
          const marginRight = marginLeft;
          const chartWidth = pageWidth - marginLeft - marginRight;

          if (y + chartHeight + 4 > pageHeight) {
            doc.addPage();
            y = 14;
          }

          const x0 = marginLeft;
          const y0 = y;
          const x1 = x0 + chartWidth;
          const y1 = y0 + chartHeight;

          let minNet = chartData[0].net_score;
          let maxNet = chartData[0].net_score;
          chartData.forEach((p) => {
            if (p.net_score < minNet) minNet = p.net_score;
            if (p.net_score > maxNet) maxNet = p.net_score;
          });
          if (minNet === maxNet) {
            minNet -= 1;
            maxNet += 1;
          }
          const range = maxNet - minNet || 1;

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.rect(x0, y0, chartWidth, chartHeight);

          if (minNet < 0 && maxNet > 0) {
            const zeroY = y1 - ((0 - minNet) / range) * chartHeight;
            doc.setDrawColor(200, 200, 200);
            doc.line(x0, zeroY, x1, zeroY);
          }

          doc.setDrawColor(37, 99, 235);
          doc.setLineWidth(0.5);
          const n = chartData.length;
          chartData.forEach((p, idx) => {
            const t = n === 1 ? 0 : idx / (n - 1);
            const px = x0 + t * chartWidth;
            const py =
              y1 - ((p.net_score - minNet) / range) * chartHeight;
            if (idx === 0) doc.moveTo(px, py);
            else doc.lineTo(px, py);
          });
          doc.stroke();

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("Trial", x0 + chartWidth / 2, y1 + 4, {
            align: "center",
          });

          y = y1 + 8;

          // Table header
          addLine(
            "Trial  Correct  Incorrect  Net  Duration(s)  Deck",
            { bold: true }
          );

          runs.forEach((run, idx) => {
            const netScore =
              run.net_score != null
                ? run.net_score
                : (run.correct ?? 0) - (run.incorrect ?? 0);

            const deckLabel = (run.deck ?? "").slice(0, 20);
            const line =
              `${String(idx + 1).padStart(2, " ")}      ` +
              `${String(run.correct).padStart(3, " ")}      ` +
              `${String(run.incorrect).padStart(3, " ")}      ` +
              `${String(netScore).padStart(3, " ")}      ` +
              `${run.duration_seconds ?? ""}      ` +
              `${deckLabel}`;
            addLine(line);
          });

          addLine();
        });
      }

      doc.save(
        `safmeds_recent_${weeklySummary.week_start.replace(/-/g, "")}.pdf`
      );
    } catch (e) {
      console.error(e);
      alert("Error generating PDF report. Check console for details.");
    }
  };

  if (!user) return null;

  // 🔹 Newest day on top in the UI
  const dayKeys = Object.keys(runsByDay)
    .sort()
    .reverse();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">SAFMEDS — Recent Runs</h1>

      {/* Navigation */}
      <nav className="flex flex-wrap gap-4 text-sm text-slate-600 mt-1 mb-2">
        <Link href="/safmeds" className="underline hover:text-slate-900">
          ← SAFMEDS Home
        </Link>
        <Link
          href="/safmeds/trials"
          className="underline hover:text-slate-900"
        >
          Timings / Run SAFMEDS
        </Link>
        <Link
          href="/safmeds/downloads"
          className="underline hover:text-slate-900"
        >
          Downloads & Reports
        </Link>
      </nav>

      {loading && <p>Loading SAFMEDS data…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && !weeklySummary && (
        <p>No SAFMEDS runs found yet for this user.</p>
      )}

      {!loading && !error && weeklySummary && (
        <>
          {/* Small debug line so we can SEE that rows are coming in */}
          <p className="text-xs text-slate-500">
            Found{" "}
            <strong>
              {Object.values(runsByDay).reduce(
                (sum, arr) => sum + arr.length,
                0
              )}
            </strong>{" "}
            runs across <strong>{dayKeys.length}</strong> day
            {dayKeys.length === 1 ? "" : "s"}.
          </p>

          {/* Buttons row */}
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={handleDownloadCsv}
              disabled={dayKeys.length === 0}
              className="px-4 py-2 rounded-lg border bg-blue-600 text-white disabled:opacity-50 text-sm"
            >
              Download CSV
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={dayKeys.length === 0}
              className="px-4 py-2 rounded-lg border bg-green-600 text-white disabled:opacity-50 text-sm"
            >
              Download PDF Report
            </button>
          </div>

          {/* Summary card */}
          <div className="space-y-6 mt-2">
            <div className="border rounded-xl p-4 bg-white shadow-sm space-y-1">
              <h2 className="text-lg font-semibold">
                Starting from {weeklySummary.week_start}
              </h2>
              <p>Total trials: {weeklySummary.total_trials}</p>
              <p>
                Avg correct: {weeklySummary.avg_correct.toFixed(1)} / Avg
                attempted: {weeklySummary.avg_attempted.toFixed(1)}
              </p>
              <p>Avg accuracy: {weeklySummary.avg_accuracy.toFixed(1)}%</p>
              <p>
                Best correct (single trial): {weeklySummary.best_correct} (
                {weeklySummary.best_accuracy.toFixed(1)}%)
              </p>
            </div>

            {/* Per-day graphs + tables */}
            {dayKeys.length === 0 ? (
              <p>No trials in this dataset.</p>
            ) : (
              <div className="space-y-6">
                {dayKeys.map((day) => {
                  const runs = runsByDay[day];

                  const totalCorrect = runs.reduce(
                    (sum, r) => sum + (r.correct ?? 0),
                    0
                  );
                  const totalIncorrect = runs.reduce(
                    (sum, r) => sum + (r.incorrect ?? 0),
                    0
                  );

                  const perRunAccuracies = runs.map((r) => {
                    const attempts =
                      (r.correct ?? 0) + (r.incorrect ?? 0);
                    return attempts > 0
                      ? (r.correct / attempts) * 100
                      : 0;
                  });
                  const bestAccuracy =
                    perRunAccuracies.length > 0
                      ? Math.max(...perRunAccuracies)
                      : 0;

                  // Up to 5 runs for graph (best net score first)
                  const topRuns = [...runs]
                    .map((r) => ({
                      ...r,
                      displayNet:
                        r.net_score != null
                          ? r.net_score
                          : (r.correct ?? 0) - (r.incorrect ?? 0),
                    }))
                    .sort((a, b) => b.displayNet - a.displayNet)
                    .slice(0, 5);

                  const chartData = topRuns.map((run, idx) => ({
                    trial_number: idx + 1,
                    net_score: run.displayNet,
                    correct: run.correct,
                    incorrect: run.incorrect,
                  }));

                  return (
                    <div
                      key={day}
                      className="border rounded-xl p-4 bg-white shadow-sm"
                    >
                      <h3 className="text-md font-semibold mb-2">
                        {day} — {runs.length} trial
                        {runs.length !== 1 ? "s" : ""}  
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        Graph shows <strong>up to 5 runs</strong> for this day
                        (best net score first). A day with only one trial will
                        show a single point.
                      </p>

                      <p className="text-xs text-gray-700 mb-2">
                        Total correct:{" "}
                        <span className="font-semibold">
                          {totalCorrect}
                        </span>{" "}
                        · Total incorrect:{" "}
                        <span className="font-semibold">
                          {totalIncorrect}
                        </span>{" "}
                        · Best accuracy:{" "}
                        <span className="font-semibold">
                          {bestAccuracy.toFixed(1)}%
                        </span>
                      </p>

                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="trial_number"
                              label={{
                                value: "Run (best to 5th best)",
                                position: "insideBottom",
                                offset: -5,
                              }}
                            />
                            <YAxis />
                            <Tooltip />
                            <Line
                              type="linear" // straight lines
                              dataKey="net_score"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="overflow-x-auto mt-3">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 px-1">Trial</th>
                              <th className="text-right py-1 px-1">Correct</th>
                              <th className="text-right py-1 px-1">
                                Incorrect
                              </th>
                              <th className="text-right py-1 px-1">Net</th>
                              <th className="text-right py-1 px-1">
                                Duration
                              </th>
                              <th className="text-left py-1 px-1">Deck</th>
                              <th className="text-left py-1 px-1">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {runs.map((run, idx) => {
                              const net =
                                run.net_score != null
                                  ? run.net_score
                                  : (run.correct ?? 0) -
                                    (run.incorrect ?? 0);

                              return (
                                <tr
                                  key={run.id}
                                  className="border-b last:border-0"
                                >
                                  <td className="py-1 px-1">{idx + 1}</td>
                                  <td className="py-1 px-1 text-right">
                                    {run.correct}
                                  </td>
                                  <td className="py-1 px-1 text-right">
                                    {run.incorrect}
                                  </td>
                                  <td className="py-1 px-1 text-right">
                                    {net}
                                  </td>
                                  <td className="py-1 px-1 text-right">
                                    {run.duration_seconds ?? ""}  
                                  </td>
                                  <td className="py-1 px-1">
                                    {run.deck ?? ""}
                                  </td>
                                  <td className="py-1 px-1">
                                    {run.notes ?? ""}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
