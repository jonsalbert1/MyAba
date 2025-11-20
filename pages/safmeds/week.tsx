// pages/safmeds/week.tsx
import { useEffect, useRef, useState } from "react";
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

  // ✅ This ref will wrap everything we want in the PDF (summary + graphs + tables)
  const reportRef = useRef<HTMLDivElement | null>(null);

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

        // 2) Get all safmeds_runs for that week (all trials, not just best-of-day)
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
            (run.deck ?? "").replace(/,/g, " "), // avoid breaking CSV
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

  // ✅ New: Download PDF of the report section
  const handleDownloadPdf = async () => {
    if (!weeklySummary || !reportRef.current) return;

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;
      let remainingHeight = imgHeight;

      // If content is taller than one page, add extra pages
      let page = 0;
      while (remainingHeight > 0) {
        if (page > 0) {
          pdf.addPage();
        }
        const sourceY =
          (imgHeight - remainingHeight) * (canvas.height / imgHeight);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(
          (pdfHeight * canvas.height) / pdfWidth,
          remainingHeight * (canvas.height / imgHeight)
        );
        const pageCtx = pageCanvas.getContext("2d");
        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            pageCanvas.height,
            0,
            0,
            canvas.width,
            pageCanvas.height
          );
        }
        const pageData = pageCanvas.toDataURL("image/png");
        pdf.addImage(pageData, "PNG", 0, 0, imgWidth, pdfHeight);
        remainingHeight -= pdfHeight;
        page += 1;
      }

      pdf.save(
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

          {/* ✅ Everything inside this div will be captured in the PDF */}
          <div ref={reportRef} className="space-y-6 mt-2">
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

            {/* One graph + table per day */}
            {dayKeys.length === 0 ? (
              <p>No trials for this week yet.</p>
            ) : (
              <div className="space-y-6">
                {dayKeys.map((day) => {
                  const runs = runsByDay[day];

                  // Build chart data: trial number vs net_score
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
                        incorrect) per trial for this day. This is what you can
                        reference or describe in your weekly summary document.
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

                      {/* Mini table of the day's runs */}
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
