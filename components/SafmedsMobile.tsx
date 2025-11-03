// components/SafmedsMobile.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =========================
   Types
========================= */
type Card = { id: string; term: string; definition: string; deck?: string | null };
type Attempt = {
  timestampISO: string;
  duration_s: number;
  correct: number;
  incorrect: number;
  total: number;
  accuracy_pct: number;
};

interface SafmedsMobileProps {
  deckName?: string; // optional admin label
}

/* =========================
   Helpers
========================= */
const DEMO_CARDS: Card[] = [
  { id: "1", term: "Interobserver Agreement (IOA)", definition: "Degree to which two observers record the same events in the same way." },
  { id: "2", term: "Latency", definition: "Time between antecedent stimulus and onset of behavior." },
  { id: "3", term: "Duration", definition: "Total time a behavior occurs." },
];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
function endOfToday(): Date {
  const s = startOfToday();
  const e = new Date(s);
  e.setDate(s.getDate() + 1);
  return e;
}

/* =========================
   Component
========================= */
export default function SafmedsMobile({ deckName = "" }: SafmedsMobileProps) {
  // Controls
  const [duration, setDuration] = useState<number>(60); // 30 or 60
  const [shuffleOnStart, setShuffleOnStart] = useState<boolean>(true);

  // Cards
  const [cards, setCards] = useState<Card[]>(DEMO_CARDS);
  const [index, setIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState<boolean>(false); // false => TERM first

  // Timer / run state
  const [remaining, setRemaining] = useState<number>(duration);
  const [running, setRunning] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runStartRef = useRef<string | null>(null);

  // Counters (use refs so timer closures always see latest values)
  const [correct, _setCorrect] = useState<number>(0);
  const [incorrect, _setIncorrect] = useState<number>(0);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const setCorrect = (v: number | ((n: number) => number)) => {
    const nv = typeof v === "function" ? (v as any)(correctRef.current) : v;
    correctRef.current = nv; _setCorrect(nv);
  };
  const setIncorrect = (v: number | ((n: number) => number)) => {
    const nv = typeof v === "function" ? (v as any)(incorrectRef.current) : v;
    incorrectRef.current = nv; _setIncorrect(nv);
  };
  const total = correct + incorrect;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  // Today’s server attempts
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // Auth token for API
  const [authToken, setAuthToken] = useState<string | null>(null);

  const current = cards[index];

  /* =========================
     Auth: keep access token available
  ========================= */
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setAuthToken(data.session?.access_token ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthToken(session?.access_token ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* =========================
     Load cards from API
  ========================= */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flashcards?limit=2000", { credentials: "include" });
        if (!res.ok) throw new Error("flashcards api error");
        const json = await res.json();
        const list: Card[] = Array.isArray(json?.cards) && json.cards.length
          ? json.cards.map((c: any) => ({
              id: String(c.id),
              term: String(c.term ?? ""),
              definition: String(c.definition ?? ""),
              deck: c.deck ?? null,
            }))
          : DEMO_CARDS;
        if (!cancelled) {
          setCards(list);
          setIndex(0);
          setShowBack(false);
        }
      } catch {
        if (!cancelled) {
          setCards(DEMO_CARDS);
          setIndex(0);
          setShowBack(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* =========================
     Timer tick
  ========================= */
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setRunning(false);
          saveRun(true); // auto-save at 0
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  useEffect(() => {
    if (!running) setRemaining(duration);
  }, [duration, running]);

  /* =========================
     Keyboard shortcuts
  ========================= */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (running) { e.preventDefault(); setShowBack((s) => !s); }
      } else if (running && e.key === "ArrowRight") {
        e.preventDefault(); next();
      } else if (running && e.key === "ArrowLeft") {
        e.preventDefault(); prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, index]);

  /* =========================
     Server: fetch today’s runs
  ========================= */
  async function fetchToday() {
    try {
      const s = startOfToday().toISOString();
      const e = endOfToday().toISOString();
      const r = await fetch(
        `/api/safmeds/week?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`,
        {
          credentials: "include",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      if (!r.ok) { setAttempts([]); return; }
      const json = await r.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      const mapped: Attempt[] = rows.map((v: any) => {
        const c = Number(v.correct ?? 0);
        const ic = Number(v.incorrect ?? 0);
        const tot = c + ic;
        return {
          timestampISO: String(v.run_started_at),
          duration_s: Number(v.duration_seconds ?? 0),
          correct: c,
          incorrect: ic,
          total: tot,
          accuracy_pct: tot ? Math.round((c / tot) * 100) : 0,
        };
      });
      // chronological
      setAttempts(mapped.sort((a, b) =>
        new Date(a.timestampISO).getTime() - new Date(b.timestampISO).getTime()
      ));
    } catch {
      setAttempts([]);
    }
  }
  useEffect(() => { fetchToday(); }, [authToken]);

  /* =========================
     Run controls
  ========================= */
  function startStop() {
    if (running) {
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    } else {
      const prepared = shuffleOnStart ? shuffled(cards) : cards;
      setCards(prepared);
      setIndex(0);
      setShowBack(false); // TERM first
      setCorrect(0);
      setIncorrect(0);
      setRemaining(duration);
      runStartRef.current = new Date().toISOString();
      setRunning(true);
    }
  }

  function flip() {
    if (!running) return;
    setShowBack((s) => !s);
  }

  function next() {
    setShowBack(false);
    setIndex((i) => (i + 1) % cards.length);
  }

  function prev() {
    setShowBack(false);
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  }

  function mark(ok: boolean) {
    if (!running || !showBack) return; // only score when running & on definition
    ok ? setCorrect((v) => v + 1) : setIncorrect((v) => v + 1);
    next();
  }

  function resetCounters() {
    setCorrect(0);
    setIncorrect(0);
  }

  /* =========================
     Save run to server
  ========================= */
  async function saveRun(auto = false) {
    try {
      const now = new Date().toISOString();
      const body = {
        deck: deckName || null,
        duration_seconds: duration,
        correct: correctRef.current,
        incorrect: incorrectRef.current,
        run_started_at: runStartRef.current ?? now,
        run_ended_at: now,
      };
      const resp = await fetch("/api/safmeds/run", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!json?.ok) {
        console.warn("Save run failed:", json?.error);
      }
    } catch (e) {
      console.warn("Save run error:", e);
    } finally {
      await fetchToday(); // server truth
      if (!auto) {
        // optional toast here
      }
    }
  }

  /* =========================
     Export (today CSV)
  ========================= */
  function exportCSV() {
    const headers = ["timestamp_iso","duration_s","correct","incorrect","total","accuracy_pct"];
    const rows = attempts.map(a => [
      JSON.stringify(a.timestampISO),
      a.duration_s, a.correct, a.incorrect, a.total, a.accuracy_pct
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safmeds_today_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* =========================
     Tiny SVG chart (today, last 5)
     - Adds safe inner padding (no clipping)
     - Smaller dots and thin line
  ========================= */
  function AttemptsChart() {
    // draw only the last 5 attempts
    const last = attempts.slice(-5);
    const N = Math.max(1, last.length);

    // Chart sizing
    const W = 100;                   // svg viewBox width
    const H = 44;                    // svg viewBox height (slightly taller)
    const PAD = 6;                   // inner padding on all sides
    const innerH = H - PAD * 2;

    // x-range kept away from edges so dots never clip
    const X_L = 6;
    const X_R = 94;

    // values to plot (net = correct - incorrect)
    const pts = last.map(a => ({ net: a.correct - a.incorrect }));

    const vals = pts.map(p => p.net);
    let yMin = 0, yMax = 1;
    if (vals.length) {
      const minV = Math.min(...vals), maxV = Math.max(...vals);
      if (minV === maxV) {
        yMin = Math.min(0, minV - 1);
        yMax = maxV + 1;
      } else {
        const padY = Math.max(1, Math.round((maxV - minV) * 0.15));
        yMin = Math.max(0, minV - padY);
        yMax = maxV + padY;
      }
    }

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    const xOf = (i: number) =>
      N === 1 ? 50 : X_L + ((X_R - X_L) * i) / (N - 1);

    const yOf = (v: number) => {
      const t = (v - yMin) / Math.max(1, yMax - yMin);
      const y = H - (t * innerH + PAD);
      // keep dots/line fully inside
      return clamp(y, PAD + 0.5, H - PAD - 0.5);
    };

    const GRID = 4;
    const gridYs = Array.from({ length: GRID + 1 }, (_, i) => {
      const t = i / GRID;
      return H - (t * innerH + PAD);
    });

    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i)},${yOf(p.net)}`).join(" ");

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[140px] w-full"
        preserveAspectRatio="none"
      >
        {/* light horizontal grid */}
        {gridYs.map((gy, i) => (
          <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="currentColor" opacity="0.06" strokeWidth="0.3" />
        ))}

        {/* connecting line */}
        {pts.length > 1 && (
          <path
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.35"
            opacity="0.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={xOf(i)}
            cy={yOf(p.net)}
            r={0.55}
            className="fill-blue-600"
            stroke="white"
            strokeWidth={0.25}
          />
        ))}
      </svg>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
    <main className="mx-auto max-w-screen-sm px-3 pb-28 pt-2 sm:px-4">
      {/* Header: Start/Pause + Timer */}
      <header className="sticky top-0 z-30 -mx-3 mb-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:-mx-4">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2 px-3 py-2 sm:px-4">
          <button
            onClick={startStop}
            className={`min-w-[92px] rounded-xl px-4 py-2 text-sm font-semibold shadow ${running ? "bg-gray-900 text-white" : "bg-blue-600 text-white"}`}
          >
            {running ? "Pause" : "Start"}
          </button>
          <div className="ml-auto text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Time</div>
            <div className="text-2xl font-bold tabular-nums">
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label>
          <span className="block text-xs font-medium text-gray-600">Duration</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[30, 60].map((s) => (
              <option key={s} value={s}>{s}s</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shuffleOnStart}
            onChange={(e) => setShuffleOnStart(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-sm">Shuffle on start</span>
        </label>

        <div className="col-span-2 sm:col-span-1">
          <span className="block text-xs font-medium text-gray-600">Deck</span>
          <div className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-gray-700">
            {deckName || "(admin-controlled)"}
          </div>
        </div>
      </section>

      {/* Card */}
      <section className="mb-2 select-none rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>Card {index + 1} of {cards.length}</span>
          {!!deckName && <span className="rounded-full bg-gray-100 px-2 py-0.5">{deckName}</span>}
        </div>

        <div className="min-h-[140px] cursor-pointer" onClick={flip}>
          {/* TERM first; DEF on flip */}
          {!showBack ? (
            <div className="text-balance text-2xl font-semibold leading-snug sm:text-3xl">
              {current?.term ?? "—"}
            </div>
          ) : (
            <div className="text-lg leading-relaxed text-gray-800 sm:text-xl">
              {current?.definition ?? "—"}
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-500">
            {running ? "Tap / Space to flip" : "Start to enable flip & scoring"}
          </p>
        </div>

        {/* Correct / Incorrect under the card */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => mark(true)}
            disabled={!running || !showBack}
            className={`rounded-xl px-4 py-3 text-base font-semibold text-white shadow active:scale-[.99] ${
              running && showBack ? "bg-green-600" : "bg-green-300 cursor-not-allowed"
            }`}
          >
            ✓ Correct ({correct})
          </button>
          <button
            onClick={() => mark(false)}
            disabled={!running || !showBack}
            className={`rounded-xl px-4 py-3 text-base font-semibold text-white shadow active:scale-[.99] ${
              running && showBack ? "bg-red-600" : "bg-red-300 cursor-not-allowed"
            }`}
          >
            ✕ Incorrect ({incorrect})
          </button>
        </div>

        {/* Nav prev/next (small) */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <button onClick={prev} className="rounded-lg border px-3 py-1">← Prev</button>
          <button onClick={next} className="rounded-lg border px-3 py-1">Next →</button>
        </div>
      </section>

      {/* Quick stats + actions */}
      <section className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
        <div className="rounded-xl border p-2">
          <div className="text-gray-500">Total</div>
          <div className="text-lg font-semibold tabular-nums">{total}</div>
        </div>
        <div className="rounded-xl border p-2">
          <div className="text-gray-500">Accuracy</div>
          <div className="text-lg font-semibold tabular-nums">{accuracy}%</div>
        </div>
        <div className="rounded-xl border p-2">
          <div className="text-gray-500">Deck</div>
          <div className="text-lg font-semibold">{deckName || "(admin)"}</div>
        </div>
      </section>

      <section className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => saveRun(false)} className="rounded-xl border px-3 py-2 text-sm">
          Save run now
        </button>
        <button onClick={exportCSV} className="rounded-xl border px-3 py-2 text-sm">
          Export CSV (today)
        </button>
        <button onClick={resetCounters} className="rounded-xl border px-3 py-2 text-sm">
          Reset counters
        </button>
      </section>

      {/* Today’s attempts (server) */}
      <section className="mb-4 rounded-2xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Today’s attempts</h3>
          <div className="text-xs text-gray-500">{attempts.length} run(s)</div>
        </div>
        <div className="w-full rounded-xl border bg-white">
          {attempts.slice(-5).length === 0 ? (
            <div className="flex h-[140px] items-center justify-center text-xs text-gray-500">
              No server runs today
            </div>
          ) : (
            <AttemptsChart />
          )}
        </div>
        <div className="mt-1 px-1 text-[11px] text-gray-500">
          Showing last 5 attempts (Net = ✓ − ✕)
        </div>
      </section>

      {/* All runs (today) table — last 5 only */}
      <section className="mb-16 rounded-2xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">All runs (today)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="px-2 py-1">Time</th>
                <th className="px-2 py-1">✓</th>
                <th className="px-2 py-1">✕</th>
                <th className="px-2 py-1">Σ</th>
                <th className="px-2 py-1">Acc%</th>
                <th className="px-2 py-1">Dur(s)</th>
              </tr>
            </thead>
            <tbody>
              {attempts.slice(-5).reverse().map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{new Date(r.timestampISO).toLocaleTimeString()}</td>
                  <td className="px-2 py-1 tabular-nums">{r.correct}</td>
                  <td className="px-2 py-1 tabular-nums">{r.incorrect}</td>
                  <td className="px-2 py-1 tabular-nums">{r.total}</td>
                  <td className="px-2 py-1 tabular-nums">{r.accuracy_pct}</td>
                  <td className="px-2 py-1 tabular-nums">{r.duration_s}</td>
                </tr>
              ))}
              {attempts.slice(-5).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-center text-gray-500">No runs yet today</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
