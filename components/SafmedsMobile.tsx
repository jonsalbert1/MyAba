// components/SafmedsMobile.tsx
import { useEffect, useRef, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

/* =========================
   Types
========================= */
type Card = {
  id: string;
  term: string;
  definition: string;
  deck?: string | null;
  class_code?: string | null;
  deck_number?: number | null;
};

type Attempt = {
  timestampISO: string;
  duration_s: number;
  correct: number;
  incorrect: number;
  total: number;
  accuracy_pct: number;
  ordinal_today: number; // 1–N within the day
};

interface SafmedsMobileProps {
  deckName?: string; // optional label for runs table (kept for now)
}

/* =========================
   Helpers
========================= */
const DEMO_CARDS: Card[] = [
  {
    id: "1",
    term: "Interobserver Agreement (IOA)",
    definition:
      "Degree to which two observers record the same events in the same way.",
  },
  {
    id: "2",
    term: "Latency",
    definition: "Time between antecedent stimulus and onset of behavior.",
  },
  {
    id: "3",
    term: "Duration",
    definition: "Total time a behavior occurs.",
  },
];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Local (machine) midnight — aligns with your dev box
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

// Daily target (your “5 sessions per day” goal)
const DAILY_TARGET = 5;

/* =========================
   Component
========================= */
export default function SafmedsMobile({ deckName = "" }: SafmedsMobileProps) {
  const supabase = useSupabaseClient();
  const user = useUser();

  // Controls
  const [duration, setDuration] = useState<number>(60); // 30 or 60
  const [shuffleOnStart, setShuffleOnStart] = useState<boolean>(true);

  // Class / deck selection (like flashcards)
  const [classCode, setClassCode] = useState<string>("");
  const [deckNum, setDeckNum] = useState<number>(1);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [deckNumOptions, setDeckNumOptions] = useState<number[]>([1]);

  // Cards
  const [cards, setCards] = useState<Card[]>(DEMO_CARDS);
  const [index, setIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState<boolean>(false); // false => TERM first

  // Timer / run state
  const [remaining, setRemaining] = useState<number>(duration);
  const [running, setRunning] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runStartRef = useRef<string | null>(null);

  // Counters
  const [correct, _setCorrect] = useState<number>(0);
  const [incorrect, _setIncorrect] = useState<number>(0);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);

  const setCorrect = (v: number | ((n: number) => number)) => {
    const nv = typeof v === "function" ? (v as any)(correctRef.current) : v;
    correctRef.current = nv;
    _setCorrect(nv);
  };

  const setIncorrect = (v: number | ((n: number) => number)) => {
    const nv = typeof v === "function" ? (v as any)(incorrectRef.current) : v;
    incorrectRef.current = nv;
    _setIncorrect(nv);
  };

  const total = correct + incorrect;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  // Today’s server attempts
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // For UI feedback when not authenticated / session expired
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // For simple “loading cards” status
  const [loadingCards, setLoadingCards] = useState<boolean>(false);

  /* =========================
     Meta: load class_codes + deck_numbers
  ========================= */
  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const resp = await fetch("/api/flashcards/meta", { cache: "no-store" });
        if (!resp.ok) return;
        const json = await resp.json();
        if (cancelled) return;

        const classesFromDb: string[] = Array.isArray(json.class_codes)
          ? json.class_codes.filter(
              (x: any) =>
                typeof x === "string" &&
                x.trim() !== "" &&
                x.trim().toUpperCase() !== "DEFAULT"
            )
          : [];

        const deckNumsFromDb: number[] = Array.isArray(json.deck_numbers)
          ? json.deck_numbers.filter((x: any) => typeof x === "number")
          : [];

        setClassOptions(Array.from(new Set(classesFromDb)).sort());
        setDeckNumOptions((prev) => {
          const set = new Set(prev);
          deckNumsFromDb.forEach((n) => set.add(n));
          if (!set.has(1)) set.add(1);
          return Array.from(set).sort((a, b) => a - b);
        });
      } catch {
        // keep defaults if meta fails
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  // When class options arrive and none is chosen yet, pick the first
  useEffect(() => {
    if (!classCode && classOptions.length > 0) {
      setClassCode(classOptions[0]);
    }
  }, [classCode, classOptions]);

  /* =========================
     Load cards from flashcards API
     - filters by class_code + deck_number (like Flashcards page)
  ========================= */
  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      if (!classCode) {
        // Wait until we know which class to use
        return;
      }

      setLoadingCards(true);
      try {
        const p = new URLSearchParams();
        p.set("limit", "2000");
        p.set("class_code", classCode);
        if (deckNum) p.set("deck_number", String(deckNum));

        const res = await fetch(`/api/flashcards?${p.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("flashcards api error");

        const json = await res.json();
        const rawList: any[] =
          Array.isArray(json?.cards) && json.cards.length
            ? json.cards
            : Array.isArray(json?.data) && json.data.length
            ? json.data
            : [];

        const list: Card[] =
          rawList.length > 0
            ? rawList.map((c: any) => ({
                id: String(c.id),
                term: String(c.term ?? ""),
                definition: String(c.definition ?? ""),
                deck: c.deck ?? null,
                class_code: c.class_code ?? null,
                deck_number:
                  typeof c.deck_number === "number"
                    ? c.deck_number
                    : c.deck_number
                    ? Number(c.deck_number)
                    : null,
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
      } finally {
        if (!cancelled) setLoadingCards(false);
      }
    }

    loadCards();
    return () => {
      cancelled = true;
    };
  }, [classCode, deckNum]);

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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (running) {
          e.preventDefault();
          setShowBack((s) => !s);
        }
      } else if (running && e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (running && e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  /* =========================
     Server: fetch today’s runs
  ========================= */
  async function fetchToday() {
    try {
      const s = startOfToday().toISOString();
      const e = endOfToday().toISOString();

      const { data, error } = await supabase
        .from("safmeds_runs")
        .select("run_started_at, duration_seconds, correct, incorrect")
        .gte("run_started_at", s)
        .lt("run_started_at", e)
        .order("run_started_at", { ascending: true });

      if (error) throw error;

      const sorted = (data ?? []).slice().sort((a: any, b: any) => {
        return (
          new Date(a.run_started_at).getTime() -
          new Date(b.run_started_at).getTime()
        );
      });

      const mapped: Attempt[] = sorted.map((v: any, idx: number) => {
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
          ordinal_today: idx + 1,
        };
      });

      setAttempts(mapped);
    } catch (err) {
      console.warn("fetchToday error", err);
      setAttempts([]);
    }
  }

  useEffect(() => {
    if (!user) {
      setAttempts([]);
      return;
    }
    fetchToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id]);

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

      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes?.session?.access_token ?? null;

      if (!token || !user) {
        setAuthWarning("You’re not signed in. Please sign in to save runs.");
        return;
      } else {
        setAuthWarning(null);
      }

      const body = {
        // keep deckName for now so we don't break existing rows
        deck:
          deckName ||
          (classCode ? `${classCode}-deck-${deckNum || 1}` : null),
        duration_seconds: duration,
        correct: correctRef.current,
        incorrect: incorrectRef.current,
        run_started_at: runStartRef.current ?? now,
      };

      const resp = await fetch("/api/safmeds/run", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        console.warn("Save run failed:", json?.error || resp.statusText);
        if (resp.status === 401) {
          setAuthWarning("Session expired. Please sign in again.");
        }
      }
    } catch (e) {
      console.warn("Save run error:", e);
    } finally {
      await fetchToday();
      if (!auto) {
        // optional toast hook could go here
      }
    }
  }

  /* =========================
     Export (today CSV)
  ========================= */
  function exportCSV() {
    const headers = [
      "run_number_today",
      "timestamp_iso",
      "duration_s",
      "correct",
      "incorrect",
      "total",
      "accuracy_pct",
    ];
    const rows = attempts.map((a) =>
      [
        a.ordinal_today,
        JSON.stringify(a.timestampISO),
        a.duration_s,
        a.correct,
        a.incorrect,
        a.total,
        a.accuracy_pct,
      ].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safmeds_today_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* =========================
     Tiny SVG chart (today, last 5)
  ========================= */
  function AttemptsChart() {
    const last = attempts.slice(-5);
    const N = Math.max(1, last.length);

    const W = 100;
    const H = 44;
    const PAD = 6;
    const innerH = H - PAD * 2;

    const X_L = 6;
    const X_R = 94;

    const pts = last.map((a) => ({ net: a.correct - a.incorrect }));

    const vals = pts.map((p) => p.net);
    let yMin = 0,
      yMax = 1;
    if (vals.length) {
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      if (minV === maxV) {
        yMin = Math.min(0, minV - 1);
        yMax = maxV + 1;
      } else {
        const padY = Math.max(1, Math.round((maxV - minV) * 0.15));
        yMin = Math.max(0, minV - padY);
        yMax = maxV + padY;
      }
    }

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, v));
    const xOf = (i: number) =>
      N === 1 ? 50 : X_L + ((X_R - X_L) * i) / (N - 1);
    const yOf = (v: number) => {
      const t = (v - yMin) / Math.max(1, yMax - yMin);
      const y = H - (t * innerH + PAD);
      return clamp(y, PAD + 0.5, H - PAD - 0.5);
    };

    const GRID = 4;
    const gridYs = Array.from({ length: GRID + 1 }, (_, i) => {
      const t = i / GRID;
      return H - (t * innerH + PAD);
    });

    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i)},${yOf(p.net)}`)
      .join(" ");

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[140px] w-full"
        preserveAspectRatio="none"
      >
        {gridYs.map((gy, i) => (
          <line
            key={i}
            x1={0}
            y1={gy}
            x2={W}
            y2={gy}
            stroke="currentColor"
            opacity="0.06"
            strokeWidth="0.3"
          />
        ))}
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
     Derived: daily target
  ========================= */
  const runsToday = attempts.length;
  const targetPercent = Math.min(
    100,
    Math.round((runsToday / DAILY_TARGET) * 100),
  );

  /* =========================
     Render
  ========================= */
  const current = cards[index];

  return (
    <main className="mx-auto max-w-screen-sm px-3 pb-28 pt-2 sm:px-4">
      {/* Header: Start/Pause + Timer */}
      <header className="sticky top-0 z-30 -mx-3 mb-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:-mx-4">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2 px-3 py-2 sm:px-4">
          <button
            onClick={startStop}
            className={`min-w-[92px] rounded-xl px-4 py-2 text-sm font-semibold shadow ${
              running ? "bg-gray-900 text-white" : "bg-blue-600 text-white"
            }`}
          >
            {running ? "Pause" : "Start"}
          </button>
          <div className="ml-auto text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Time
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label>
          <span className="block text-xs font-medium text-gray-600">
            Duration
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[30, 60].map((s) => (
              <option key={s} value={s}>
                {s}s
              </option>
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

        <label className="col-span-2 sm:col-span-1">
          <span className="block text-xs font-medium text-gray-600">
            Class
          </span>
          <select
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {classOptions.length === 0 ? (
              <option value="">(no classes)</option>
            ) : (
              classOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="col-span-2 sm:col-span-1">
          <span className="block text-xs font-medium text-gray-600">
            Deck #
          </span>
          <select
            value={deckNum}
            onChange={(e) => {
              const n = Number(e.target.value);
              setDeckNum(!Number.isFinite(n) || n <= 0 ? 1 : n);
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {deckNumOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Daily target indicator */}
      <section className="mb-3 rounded-xl border bg-white p-3 text-xs text-gray-700">
        <div className="flex items-center justify-between">
          <span>
            Daily SAFMEDS goal:{" "}
            <strong>
              {runsToday} / {DAILY_TARGET}
            </strong>{" "}
            runs
          </span>
          <span className="text-[11px] text-gray-500">
            Extra runs still saved after {DAILY_TARGET}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-gray-200">
          <div
            className="h-1.5 rounded bg-blue-500 transition-all"
            style={{ width: `${targetPercent}%` }}
          />
        </div>
      </section>

      {/* Auth warning (if needed) */}
      {authWarning && (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {authWarning}
        </div>
      )}

      {/* Card */}
      <section className="mb-2 select-none rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            Card {index + 1} of {cards.length}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {(classCode || "Class")} • #{deckNum}
          </span>
        </div>

        <div className="min-h-[140px] cursor-pointer" onClick={flip}>
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
          {loadingCards && (
            <p className="mt-1 text-[11px] text-blue-500">
              Loading cards for {classCode || "…"} deck #{deckNum}…
            </p>
          )}
        </div>

        {/* Correct / Incorrect under the card */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => mark(true)}
            disabled={!running || !showBack}
            className={`rounded-xl px-4 py-3 text-base font-semibold text-white shadow active:scale-[.99] ${
              running && showBack
                ? "bg-green-600"
                : "bg-green-300 cursor-not-allowed"
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
          <button onClick={prev} className="rounded-lg border px-3 py-1">
            ← Prev
          </button>
          <button onClick={next} className="rounded-lg border px-3 py-1">
            Next →
          </button>
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
          <div className="text-gray-500">Set</div>
          <div className="text-lg font-semibold">
            {(classCode || "Class") + " #" + deckNum}
          </div>
        </div>
      </section>

      <section className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => saveRun(false)}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          Save run now
        </button>
        <button
          onClick={exportCSV}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          Export CSV (today)
        </button>
        <button
          onClick={resetCounters}
          className="rounded-xl border px-3 py-2 text-sm"
        >
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
                <th className="px-2 py-1">Run #</th>
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
                  <td className="px-2 py-1 tabular-nums">
                    {r.ordinal_today}
                  </td>
                  <td className="px-2 py-1">
                    {new Date(r.timestampISO).toLocaleTimeString()}
                  </td>
                  <td className="px-2 py-1 tabular-nums">{r.correct}</td>
                  <td className="px-2 py-1 tabular-nums">{r.incorrect}</td>
                  <td className="px-2 py-1 tabular-nums">{r.total}</td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.accuracy_pct}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.duration_s}
                  </td>
                </tr>
              ))}
              {attempts.slice(-5).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-3 text-center text-gray-500"
                  >
                    No runs yet today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
