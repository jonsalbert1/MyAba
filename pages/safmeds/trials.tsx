// pages/safmeds/trials.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
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
   LOCAL DATE FIX (no UTC shift)
========================= */
function getTodayLocalYMD(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type DeckMeta = {
  class_code: string;
  deck_number: number;
};

type Card = {
  id: string;
  term: string;
  definition: string;
  class_code: string;
  deck_number: number;
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

export default function SafmedsTrials() {
  const user = useUser();
  const supabase = useSupabaseClient();

  /* FIX: Use local date, not UTC-shifted date */
  const [todayString] = useState(getTodayLocalYMD());

  const [decks, setDecks] = useState<DeckMeta[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckMeta | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  const [duration, setDuration] = useState<30 | 60>(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  /* =========================
     TODAY'S DATA FIXED
  ========================== */
  const [todayRuns, setTodayRuns] = useState<SafmedsRun[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [showTop5, setShowTop5] = useState(true);

  /* Derived accuracy */
  const totalAnswers = correct + incorrect;
  const accuracy =
    totalAnswers > 0 ? Math.round((correct / totalAnswers) * 100) : null;

  /* Load decks */
  useEffect(() => {
    const loadDecks = async () => {
      try {
        setLoadingDecks(true);
        const res = await fetch("/api/flashcards/meta");
        const json = await res.json();

        if (!json.ok || json.mode !== "decks") {
          console.error("Error loading decks:", json);
          return;
        }

        const decksFromApi = (json.decks || []) as DeckMeta[];
        setDecks(decksFromApi);
        if (decksFromApi.length > 0) {
          setSelectedDeck(decksFromApi[0]);
        }
      } finally {
        setLoadingDecks(false);
      }
    };

    loadDecks();
  }, []);

  /* Load cards when deck changes */
  useEffect(() => {
    const loadCards = async () => {
      if (!selectedDeck) return;

      try {
        setLoadingCards(true);

        const url = `/api/flashcards/meta?class_code=${selectedDeck.class_code}&deck_number=${selectedDeck.deck_number}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!json.ok || json.mode !== "cards") {
          console.error("Error loading cards:", json);
          setCards([]);
          return;
        }

        setCards(json.data || []);
        setCurrentIndex(0);
        setShowDefinition(false);
      } finally {
        setLoadingCards(false);
      }
    };

    loadCards();
  }, [selectedDeck]);

  /* Countdown */
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, timeLeft]);

  /* Load today's SAFMEDS runs (FIXED) */
  const loadTodayRuns = async () => {
    if (!user) return;
    try {
      setLoadingToday(true);
      setTodayError(null);

      const { data, error } = await supabase
        .from("safmeds_runs")
        .select("*")
        .eq("user_id", user.id)
        .eq("local_day", todayString) // IMPORTANT FIX
        .order("local_ts", { ascending: true });

      if (error) throw error;

      setTodayRuns((data ?? []) as SafmedsRun[]);
    } catch (e: any) {
      setTodayError(e.message ?? "Error loading today's data");
    } finally {
      setLoadingToday(false);
    }
  };

  /* Initial load */
  useEffect(() => {
    if (user) loadTodayRuns();
  }, [user]);

  /* Auto-save fix */
  useEffect(() => {
    if (timeLeft === 0 && hasStarted && !autoSaved && totalAnswers > 0) {
      saveRun(true);
      setAutoSaved(true);
    }
  }, [timeLeft, hasStarted, autoSaved, totalAnswers]);

  /* SAVE RUN FIX */
  async function saveRun(auto = false) {
    if (!user) return;

    try {
      setSaving(true);

      const res = await fetch("/api/safmeds/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correct,
          incorrect,
          duration_seconds: duration,
          deck:
            selectedDeck &&
            `${selectedDeck.class_code} Deck ${selectedDeck.deck_number}`,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        if (!auto) setMessage(`Error saving run: ${json.error}`);
        return;
      }

      if (!auto) setMessage("Run saved ✅");
      loadTodayRuns(); // refresh today's summary
    } finally {
      setSaving(false);
    }
  }

  /* Advance card fix */
  const advanceCard = () => {
    if (cards.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    setShowDefinition(false); // go back to term
  };

  const incrementCorrect = () => {
    if (!isRunning) return;
    setCorrect((c) => c + 1);
    advanceCard();
  };
  const incrementIncorrect = () => {
    if (!isRunning) return;
    setIncorrect((c) => c + 1);
    advanceCard();
  };

  const handleCardClick = () => {
    if (!hasStarted) return;
    setShowDefinition((prev) => !prev);
  };

  const deckValue =
    selectedDeck && `${selectedDeck.class_code}::${selectedDeck.deck_number}`;

  const currentCard =
    cards.length > 0 && currentIndex < cards.length
      ? cards[currentIndex]
      : null;

  const isFront = !showDefinition;

  /* =========================
     Build today's chart data
  ========================== */
  const sortedTodayRuns = [...todayRuns].sort((a, b) => {
    const netA =
      a.net_score != null ? a.net_score : a.correct - a.incorrect;
    const netB =
      b.net_score != null ? b.net_score : b.correct - b.incorrect;
    return netB - netA; // best first
  });

  const runsForGraph = showTop5
    ? sortedTodayRuns.slice(0, 5)
    : sortedTodayRuns;

  const todayChartData = runsForGraph.map((run, idx) => ({
    trial_number: idx + 1,
    net_score:
      run.net_score != null ? run.net_score : run.correct - run.incorrect,
    correct: run.correct,
    incorrect: run.incorrect,
  }));

  const totalCorrectToday = todayRuns.reduce(
    (sum, r) => sum + r.correct,
    0
  );
  const totalIncorrectToday = todayRuns.reduce(
    (sum, r) => sum + r.incorrect,
    0
  );
  const bestAccuracyToday = todayRuns.length
    ? Math.max(
        ...todayRuns.map((r) => {
          const attempts = r.correct + r.incorrect;
          return attempts > 0 ? (r.correct / attempts) * 100 : 0;
        })
      )
    : 0;

  /* =========================
     RENDER
  ========================== */
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">SAFMEDS Timings</h1>
        <p className="text-sm text-slate-600">
          Start a timing, then click the card to flip.
        </p>
      </header>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/safmeds" className="underline text-slate-600">
          ← Back to SAFMEDS Home
        </Link>
        <Link href="/safmeds/week" className="underline text-slate-600">
          Weekly View
        </Link>
      </nav>

      {/* ====== TIMING SECTION (unchanged) ====== */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Deck selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">
            Deck (class_code / deck_number)
            <select
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={deckValue ?? ""}
              onChange={(e) => {
                const [cc, dn] = e.target.value.split("::");
                setSelectedDeck({
                  class_code: cc,
                  deck_number: Number(dn),
                });
              }}
              disabled={loadingDecks}
            >
              {decks.map((d) => (
                <option
                  key={`${d.class_code}::${d.deck_number}`}
                  value={`${d.class_code}::${d.deck_number}`}
                >
                  {d.class_code} — Deck {d.deck_number}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Duration buttons */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-slate-700">Duration:</span>
          <button
            onClick={() => setDuration(30)}
            className={`rounded-md border px-3 py-1 ${
              duration === 30
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            30s
          </button>
          <button
            onClick={() => setDuration(60)}
            className={`rounded-md border px-3 py-1 ${
              duration === 60
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            60s
          </button>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-between mt-2 text-sm">
          <div>Time left: <span className="text-lg font-semibold">{timeLeft}s</span></div>
          <div className="text-right">
            <div>Correct: <span className="font-semibold">{correct}</span></div>
            <div>Incorrect: <span className="font-semibold">{incorrect}</span></div>
            <div className="text-xs text-slate-500">
              Accuracy: {accuracy === null ? "—" : `${accuracy}%`}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              // shuffle deck
              setCards([...cards].sort(() => Math.random() - 0.5));
              setCurrentIndex(0);
              setShowDefinition(false);
              setCorrect(0);
              setIncorrect(0);
              setTimeLeft(duration);
              setIsRunning(true);
              setHasStarted(true);
              setMessage(null);
              setAutoSaved(false);
            }}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          >
            Start {duration}s timing
          </button>
        </div>

        {/* Card */}
        <div
          className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer"
          onClick={handleCardClick}
        >
          {!currentCard ? (
            <p>No cards available.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                {currentCard.class_code} — Deck {currentCard.deck_number} • Card{" "}
                {currentIndex + 1} of {cards.length}
              </p>
              <p className="text-xs text-slate-500">
                {isFront ? "Term" : "Definition"}
              </p>
              <div className="text-lg font-semibold">
                {isFront ? currentCard.term : currentCard.definition}
              </div>
            </div>
          )}
        </div>

        {/* Correct / Incorrect */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={incrementCorrect}
            disabled={!isRunning}
            className="flex-1 rounded-md border border-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-40"
          >
            + Correct
          </button>
          <button
            onClick={incrementIncorrect}
            disabled={!isRunning}
            className="flex-1 rounded-md border border-red-400 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"
          >
            + Incorrect
          </button>
        </div>

        {/* Manual save */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => saveRun(false)}
            disabled={saving || totalAnswers === 0}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save run"}
          </button>
          <div className="text-xs text-slate-500">
            Saves via /api/safmeds/run
          </div>
        </div>

        {message && <div className="text-xs mt-2">{message}</div>}
      </div>

      {/* ====== TODAY SUMMARY SECTION (FIXED DATE) ====== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Today&apos;s Performance ({todayString})
          </h2>

          <button
            onClick={() => setShowTop5((v) => !v)}
            className="text-xs rounded-md border px-2 py-1 text-slate-700"
          >
            {showTop5 ? "Show all runs" : "Show top 5 runs"}
          </button>
        </div>

        {loadingToday && (
          <p className="text-sm text-slate-500">Loading today&apos;s data…</p>
        )}
        {todayError && (
          <p className="text-sm text-red-600">{todayError}</p>
        )}

        {!loadingToday && !todayError && todayRuns.length === 0 && (
          <p className="text-sm text-slate-500">
            No SAFMEDS runs recorded yet for today.
          </p>
        )}

        {!loadingToday && !todayError && todayRuns.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-700">
              Runs today: <span className="font-semibold">{todayRuns.length}</span> ·
              Total correct: <span className="font-semibold">{totalCorrectToday}</span> ·
              Total incorrect: <span className="font-semibold">{totalIncorrectToday}</span> ·
              Best accuracy: <span className="font-semibold">{bestAccuracyToday.toFixed(1)}%</span>
            </p>

            {/* Graph */}
            <div className="w-full h-64 border rounded-xl bg-white shadow-sm p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={todayChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="trial_number"
                    label={{
                      value: showTop5
                        ? "Run (best to 5th best)"
                        : "Run (best to worst)",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="linear"
                    dataKey="net_score"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Data table */}
            <div className="border rounded-xl bg-white shadow-sm overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 px-1 text-left">Run</th>
                    <th className="py-1 px-1 text-right">Correct</th>
                    <th className="py-1 px-1 text-right">Incorrect</th>
                    <th className="py-1 px-1 text-right">Net</th>
                    <th className="py-1 px-1 text-right">Duration</th>
                    <th className="py-1 px-1 text-left">Deck</th>
                    <th className="py-1 px-1 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTodayRuns.map((run, idx) => {
                    const net =
                      run.net_score != null
                        ? run.net_score
                        : run.correct - run.incorrect;

                    return (
                      <tr key={run.id} className="border-b">
                        <td className="py-1 px-1">{idx + 1}</td>
                        <td className="py-1 px-1 text-right">
                          {run.correct}
                        </td>
                        <td className="py-1 px-1 text-right">
                          {run.incorrect}
                        </td>
                        <td className="py-1 px-1 text-right">{net}</td>
                        <td className="py-1 px-1 text-right">
                          {run.duration_seconds}
                        </td>
                        <td className="py-1 px-1">{run.deck ?? ""}</td>
                        <td className="py-1 px-1">{run.notes ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
