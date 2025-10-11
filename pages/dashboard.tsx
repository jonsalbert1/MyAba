// pages/dashboard.tsx
import { useEffect, useMemo, useState } from "react";

/** ----- Expected localStorage keys & shapes -----
 * Flashcards deck:  localStorage["flashcards:deck"] => Array<{ term: string; def: string }>
 * SAFMEDS deck:     localStorage["safmeds:deck"]    => Array<{ term: string; def: string }>
 * Quiz deck:        localStorage["quiz:deck"]       => Array<any>
 *
 * SAFMEDS sessions: localStorage["safmeds:sessions"] => Array<{
 *   startedAt: string;  // ISO
 *   endedAt: string;    // ISO
 *   correct: number;
 *   incorrect: number;
 *   durationSec?: number;
 * }>
 *
 * Quiz history:     localStorage["quiz:history"] => Array<{
 *   timestamp: string;  // ISO
 *   correct: number;
 *   total: number;
 * }>
 * ------------------------------------------------- */

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function DashboardPage() {
  const [flashcardsCount, setFlashcardsCount] = useState<number>(0);
  const [safmedsCount, setSafmedsCount] = useState<number>(0);
  const [quizCount, setQuizCount] = useState<number>(0);

  const [safmedsSessions, setSafmedsSessions] = useState<
    Array<{ startedAt: string; endedAt: string; correct: number; incorrect: number; durationSec?: number }>
  >([]);

  const [quizHistory, setQuizHistory] = useState<
    Array<{ timestamp: string; correct: number; total: number }>
  >([]);

  useEffect(() => {
    const fc = readLS<Array<{ term: string; def: string }>>("flashcards:deck", []);
    setFlashcardsCount(Array.isArray(fc) ? fc.length : 0);

    const sm = readLS<Array<{ term: string; def: string }>>("safmeds:deck", []);
    setSafmedsCount(Array.isArray(sm) ? sm.length : 0);

    const qd = readLS<any[]>("quiz:deck", []);
    setQuizCount(Array.isArray(qd) ? qd.length : 0);

    setSafmedsSessions(readLS("safmeds:sessions", []));
    setQuizHistory(readLS("quiz:history", []));
  }, []);

  const last5Safmeds = useMemo(
    () => [...safmedsSessions].slice(-5).reverse(),
    [safmedsSessions]
  );
  const last10Quiz = useMemo(
    () => [...quizHistory].slice(-10).reverse(),
    [quizHistory]
  );

  const safmedsAvgAcc = useMemo(() => {
    if (safmedsSessions.length === 0) return 0;
    const totals = safmedsSessions.reduce(
      (acc, s) => {
        const t = s.correct + s.incorrect;
        return { correct: acc.correct + s.correct, total: acc.total + t };
      },
      { correct: 0, total: 0 }
    );
    return totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;
  }, [safmedsSessions]);

  const quizAvgAcc = useMemo(() => {
    if (quizHistory.length === 0) return 0;
    const totals = quizHistory.reduce(
      (acc, q) => ({ correct: acc.correct + q.correct, total: acc.total + q.total }),
      { correct: 0, total: 0 }
    );
    return totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;
  }, [quizHistory]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Title */}
      <section className="mx-auto max-w-5xl px-6 pt-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of decks and recent study activity.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-6 grid gap-6">
        {/* Deck sizes */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Flashcards</p>
            <p className="mt-1 text-2xl font-bold">{flashcardsCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">SAFMEDS</p>
            <p className="mt-1 text-2xl font-bold">{safmedsCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Quiz</p>
            <p className="mt-1 text-2xl font-bold">{quizCount}</p>
          </div>
        </div>

        {/* Averages */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">SAFMEDS Average Accuracy</p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${safmedsAvgAcc}%` }} />
            </div>
            <p className="mt-2 text-sm text-gray-700">{safmedsAvgAcc}%</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Quiz Average Accuracy</p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${quizAvgAcc}%` }} />
            </div>
            <p className="mt-2 text-sm text-gray-700">{quizAvgAcc}%</p>
          </div>
        </div>

        {/* Recent SAFMEDS sessions */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent SAFMEDS Sessions</h2>
            <p className="text-sm text-gray-500">Showing {last5Safmeds.length || 0} most recent</p>
          </div>

          {last5Safmeds.length === 0 ? (
            <p className="text-sm text-gray-600">
              No SAFMEDS sessions yet. After a timing, save a record to{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5">localStorage["safmeds:sessions"]</code>.
            </p>
          ) : (
            <ul className="grid gap-3">
              {last5Safmeds.map((s, i) => {
                const total = s.correct + s.incorrect;
                const acc = total ? Math.round((s.correct / total) * 100) : 0;
                const label = new Date(s.endedAt || s.startedAt).toLocaleString();
                return (
                  <li key={i} className="rounded-xl border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">
                          {s.correct} correct / {total} total
                          {typeof s.durationSec === "number" ? ` · ${s.durationSec}s` : ""}
                        </p>
                      </div>
                      <div className="w-40">
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${acc}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-gray-600">{acc}%</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Quiz results */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Quiz Results</h2>
            <p className="text-sm text-gray-500">Showing {last10Quiz.length || 0} most recent</p>
          </div>

          {last10Quiz.length === 0 ? (
            <p className="text-sm text-gray-600">
              No quiz results yet. Save attempts to{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5">localStorage["quiz:history"]</code>.
            </p>
          ) : (
            <ul className="grid gap-3">
              {last10Quiz.map((q, i) => {
                const pct = q.total ? Math.round((q.correct / q.total) * 100) : 0;
                const when = new Date(q.timestamp).toLocaleString();
                return (
                  <li key={i} className="rounded-xl border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{when}</p>
                        <p className="text-xs text-gray-500">
                          {q.correct} / {q.total}
                        </p>
                      </div>
                      <div className="w-40">
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-gray-600">{pct}%</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
