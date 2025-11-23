// pages/safmeds/week.tsx
import { useEffect, useState } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
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
  week_start: string; // date string
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
  net_score: number;
  duration_seconds: number | null;
  deck: string | null;
  notes: string | null;
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Helper to draw a simple net-score line chart directly in jsPDF.
 * - X axis: trial_number
 * - Y axis: net_score
 */
function drawNetScoreChart(
  doc: any,
  y: number,
  pageHeight: number,
  marginLeft: number,
  chartData: { trial_number: number; net_score: number }[]
): number {
  if (!chartData.length) return y;

  const chartHeight = 40; // mm
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginRight = marginLeft;
  const chartWidth = pageWidth - marginLeft - marginRight;

  // Page break if needed
  if (y + chartHeight + 4 > pageHeight) {
    doc.addPage();
    y = 14;
  }

  const x0 = marginLeft;
  const y0 = y;
  const x1 = x0 + chartWidth;
  const y1 = y0 + chartHeight;

  // Compute min/max net score
  let minNet = chartData[0].net_score;
  let maxNet = chartData[0].net_score;
  chartData.forEach((p) => {
    if (p.net_score < minNet) minNet = p.net_score;
    if (p.net_score > maxNet) maxNet = p.net_score;
  });

  if (minNet === maxNet) {
    // avoid flat 0-range
    minNet = minNet - 1;
    maxNet = maxNet + 1;
  }

  const range = maxNet - minNet || 1;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  // Outer box
  doc.rect(x0, y0, chartWidth, chartHeight);

  // Horizontal midline (0 if in range)
  if (minNet < 0 && maxNet > 0) {
    const zeroY = y1 - ((0 - minNet) / range) * chartHeight;
    doc.setDrawColor(200, 200, 200);
    doc.line(x0, zeroY, x1, zeroY);
  }

  // Plot line
  doc.setDrawColor(37, 99, 235); // blue-ish
  doc.setLineWidth(0.5);

  const n = chartData.length;
  chartData.forEach((p, idx) => {
    const t = n === 1 ? 0 : idx / (n - 1); // 0..1
    const px = x0 + t * chartWidth;
    const py =
      y1 - ((p.net_score - minNet) / range) * chartHeight; // invert for PDF coords

    if (idx === 0) {
      doc.moveTo(px, py);
    } else {
      doc.lineTo(px, py);
    }
  });
  doc.stroke();

  // X-axis label
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Trial", x0 + chartWidth / 2, y1 + 4, { align: "center" });

  return y1 + 8; // new y with some spacing
}

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

    const loadWeek = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Get the most recent week for this user
        const { data: weeklyRows, error: weeklyErr } = await supabase
          .from("v_safmeds_weekly")
          .select("*")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(1);

        if (weeklyErr) throw weeklyErr;

        if (!weeklyRows || weeklyRows.length === 0) {
          setWeeklySummary(null);
          setRunsByDay({});
          setLoading(false);
          return;
        }

        const summary = weeklyRows[0] as WeeklySummary;
        setWeeklySummary(summary);

        const weekStart = summary.week_start.slice(0, 10);
        const weekEnd = addDays(weekStart, 6);

        // 2) Get all safmeds_runs for that week (all trials)
        const { data: runRows, error: runsErr } = await supabase
          .from("safmeds_runs")
          .select("*")
          .eq("user_id", user.id)
          .gte("local_day", weekStart)
          .lte("local_day", weekEnd)
          .order("local_day", { ascending: true })
          .order("local_ts", { ascending: true });

        if (runsErr) throw runsErr;

        const byDay: Record<string, SafmedsRun[]> = {};
        (runRows ?? []).forEach((r) => {
          const run = r as SafmedsRun;
          if (!byDay[run.local_day]) byDay[run.local_day] = [];
          byDay[run.local_day].push(run);
        });

        setRunsByDay(byDay);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error loading weekly SAFMEDS data");
        setLoading(false);
      }
    };

    loadWeek();
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
        rows.push(
          [
            weeklySummary.week_start.slice(0, 10),
            day,
            idx + 1,
            run.correct,
            run.incorrect,
            run.net_score,
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
    a.download = `safmeds_week_${weeklySummary.week_start
      .slice(0, 10)
      .replace(/-/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ PDF with text summary + simple line graphs per day (no html2canvas)
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

      const weekStr = weeklySummary.week_start.slice(0, 10);
      const dayKeys = Object.keys(runsByDay).sort();

      // Title
      doc.setFontSize(14);
      addLine(`SAFMEDS Weekly Report — Week of ${weekStr}`, { bold: true });
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
        addLine("No trials recorded for this week.");
      } else {
        // Per-day detail with chart + table-style text
        dayKeys.forEach((day) => {
          const runs = runsByDay[day];

          addLine(`Day: ${day}`, { bold: true });
          addLine(`Trials: ${runs.length}`);

          // Build chart data for this day
          const chartData = runs.map((run, idx) => ({
            trial_number: idx + 1,
            net_score: run.net_score,
          }));

          // Draw chart
          y = drawNetScoreChart(
            doc,
            y,
            pageHeight,
            marginLeft,
            chartData
          );

          // Mini text header for tabular info
          addLine(
            "Trial  Correct  Incorrect  Net  Duration(s)  Deck",
            { bold: true }
          );

          runs.forEach((run, idx) => {
            const deckLabel = (run.deck ?? "").slice(0, 20);
            const line =
              `${String(idx + 1).padStart(2, " ")}      ` +
              `${String(run.correct).padStart(3, " ")}      ` +
              `${String(run.incorrect).padStart(3, " ")}      ` +
              `${String(run.net_score).padStart(3, " ")}      ` +
              `${run.duration_seconds ?? ""}      ` +
              `${deckLabel}`;

            addLine(line);
          });

          addLine();
        });
      }

      doc.save(
        `safmeds_week_${weeklySummary.week_start
          .slice(0, 10)
          .replace(/-/g, "")}.pdf`
      );
    } catch (e) {
      console.error(e);
      alert("Error generating PDF report. Check console for details.");
    }
  };

  if (!user) return null;

  const dayKeys = Object.keys(runsByDay).sort(); // ascending dates

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">SAFMEDS — Weekly Report</h1>

      {loading && <p>Loading weekly data…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && !weeklySummary && (
        <p>No weekly SAFMEDS data found yet for this user.</p>
      )}

      {!loading && !error && weeklySummary && (
        <>
          {/* Buttons row */}
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={handleDownloadCsv}
              disabled={dayKeys.length === 0}
              className="px-4 py-2 rounded-lg border bg-blue-600 text-white disabled:opacity-50 text-sm"
            >
              Download Weekly CSV
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={dayKeys.length === 0}
              className="px-4 py-2 rounded-lg border bg-green-600 text-white disabled:opacity-50 text-sm"
            >
              Download Weekly PDF Report
            </button>
          </div>

          {/* On-screen report (summary + graphs + tables) */}
          <div className="space-y-6 mt-2">
            {/* Weekly summary card */}
            <div className="border rounded-xl p-4 bg-white shadow-sm space-y-1">
              <h2 className="text-lg font-semibold">
                Week of {weeklySummary.week_start.slice(0, 10)}
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

            {/* One graph + table per day (screen only) */}
            {dayKeys.length === 0 ? (
              <p>No trials for this week yet.</p>
            ) : (
              <div className="space-y-6">
                {dayKeys.map((day) => {
                  const runs = runsByDay[day];

                  const chartData = runs.map((run, idx) => ({
                    trial_number: idx + 1,
                    net_score: run.net_score,
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
                        Graph shows <strong>net score</strong> (correct −
                        incorrect) per trial for this day.
                      </p>

                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="trial_number"
                              label={{
                                value: "Trial",
                                position: "insideBottom",
                                offset: -5,
                              }}
                            />
                            <YAxis />
                            <Tooltip />
                            <Line
                              type="monotone"
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
                            {runs.map((run, idx) => (
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
                                  {run.net_score}
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
                            ))}
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
