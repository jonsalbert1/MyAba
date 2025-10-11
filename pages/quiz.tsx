// pages/quiz.tsx
import { useEffect, useMemo, useState, useCallback } from "react";

/** Canonical normalized quiz item */
type QuizItem = {
  domain?: string;
  question: string;
  choices: [string, string, string, string];
  /** 'A' | 'B' | 'C' | 'D' */
  answer: "A" | "B" | "C" | "D";
  rationale?: string;
};

/** Raw deck shapes we support */
type RawDeckAny =
  | Array<{
      domain?: string;
      question: string;
      a: string;
      b: string;
      c: string;
      d: string;
      answer: string; // 'A'|'B'|'C'|'D' (case-insensitive)
      rationale?: string;
    }>
  | Array<{
      domain?: string;
      question: string;
      choices: string[]; // >= 4
      answerIndex: number; // 0..3
      rationale?: string;
    }>
  | unknown;

/** Normalize whatever is in localStorage into QuizItem[] */
function normalizeDeck(raw: RawDeckAny): QuizItem[] {
  if (!Array.isArray(raw)) return [];
  const out: QuizItem[] = [];

  for (const row of raw as any[]) {
    // Shape 1: a/b/c/d + answer ('A'|'B'|'C'|'D')
    if (
      row &&
      typeof row.question === "string" &&
      typeof row.a === "string" &&
      typeof row.b === "string" &&
      typeof row.c === "string" &&
      typeof row.d === "string" &&
      typeof row.answer === "string"
    ) {
      const ans = String(row.answer).trim().toUpperCase();
      const valid = ["A", "B", "C", "D"];
      if (!valid.includes(ans)) continue;
      out.push({
        domain: row.domain ?? undefined,
        question: row.question,
        choices: [row.a, row.b, row.c, row.d],
        answer: ans as QuizItem["answer"],
        rationale: row.rationale ?? "",
      });
      continue;
    }

    // Shape 2: choices[] + answerIndex
    if (
      row &&
      typeof row.question === "string" &&
      Array.isArray(row.choices) &&
      row.choices.length >= 4 &&
      Number.isInteger(row.answerIndex)
    ) {
      const choices = row.choices.slice(0, 4) as [string, string, string, string];
      const idx = Math.max(0, Math.min(3, row.answerIndex));
      const map = ["A", "B", "C", "D"] as const;
      out.push({
        domain: row.domain ?? undefined,
        question: row.question,
        choices,
        answer: map[idx],
        rationale: row.rationale ?? "",
      });
      continue;
    }
  }

  return out;
}

function loadDeck(): QuizItem[] {
  try {
    const raw = localStorage.getItem("quiz:deck");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RawDeckAny;
    return normalizeDeck(parsed);
  } catch {
    return [];
  }
}

export default function QuizPage() {
  const [deck, setDeck] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [visited, setVisited] = useState<boolean[]>([]); // track which items have been answered at least once

  // Load deck on mount
  useEffect(() => {
    const d = loadDeck();
    if (d.length === 0) {
      // Fallback example so page renders cleanly
      setDeck([
        {
          domain: "Demo",
          question: "Which schedule delivers reinforcement after a fixed number of responses?",
          choices: ["VI", "VR", "FR", "FI"],
          answer: "C",
          rationale: "FR delivers reinforcement after a set number of responses (e.g., FR5).",
        },
      ]);
      setVisited([false]);
    } else {
      setDeck(d);
      setVisited(new Array(d.length).fill(false));
    }
  }, []);

  const total = deck.length;
  const current = deck[idx];

  const isCorrect = useMemo(() => {
    if (!selected || !current) return false;
    return selected === current.answer;
  }, [selected, current]);

  const onChoose = useCallback(
    (choice: "A" | "B" | "C" | "D") => {
      if (revealed) return; // lock after reveal
      setSelected(choice);
      setRevealed(true);
      setVisited((v) => {
        const next = v.slice();
        next[idx] = true;
        return next;
      });
      if (current && choice === current.answer) {
        setCorrectCount((n) => n + 1);
      }
    },
    [revealed, idx, current]
  );

  const goNext = useCallback(() => {
    if (total === 0) return;
    setSelected(null);
    setRevealed(false);
    setIdx((i) => (i + 1 < total ? i + 1 : i));
  }, [total]);

  const goPrev = useCallback(() => {
    if (total === 0) return;
    setSelected(null);
    setRevealed(false);
    setIdx((i) => (i - 1 >= 0 ? i - 1 : i));
  }, [total]);

  const resetAll = useCallback(() => {
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setVisited(new Array(deck.length).fill(false));
  }, [deck.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["a", "b", "c", "d"].includes(key)) {
        const map: Record<string, "A" | "B" | "C" | "D"> = { a: "A", b: "B", c: "C", d: "D" };
        onChoose(map[key]);
      } else if (key === "n") {
        goNext();
      } else if (key === "p") {
        goPrev();
      } else if (key === "r") {
        resetAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChoose, goNext, goPrev, resetAll]);

  // Derived stats
  const answeredCount = visited.filter(Boolean).length;
  const scorePct = total ? Math.round((correctCount / total) * 100) : 0;
  const progressPct = total ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Title row (consistent with Flashcards page) */}
      <section className="mx-auto max-w-5xl px-6 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Quiz</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Score: <span className="font-semibold">{correctCount}</span> / {total} ({scorePct}%)
            </div>
            <button
              onClick={resetAll}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
              title="Reset (R)"
            >
              Reset
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Use A/B/C/D, N (next), P (prev), R (reset)
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-5xl px-6 py-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Progress: {answeredCount}/{total} ({progressPct}%)
          </p>
        </div>

        {/* Question Card */}
        {current ? (
          <div className="rounded-2xl bg-white p-6 shadow-md">
            {/* Meta */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {current.domain || "Domain"}
              </span>
              <span className="text-xs text-gray-500">
                Q {idx + 1} / {total}
              </span>
            </div>

            {/* Question */}
            <h2 className="mb-6 text-xl font-semibold leading-snug text-gray-900">
              {current.question}
            </h2>

            {/* Choices */}
            <div className="grid gap-3">
              {(["A", "B", "C", "D"] as const).map((label, i) => {
                const choiceText = current.choices[i] ?? "";
                const isSelected = selected === label;
                const isAnswer = current.answer === label;

                // Base + stateful styles
                let base =
                  "w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none";
                let cls = "border-gray-300 hover:bg-gray-50";

                if (!revealed && isSelected) {
                  cls = "border-blue-500 ring-2 ring-blue-500/30";
                }

                if (revealed) {
                  if (isAnswer) cls = "border-green-600 bg-green-50";
                  if (!isAnswer && isSelected) cls = "border-red-600 bg-red-50";
                }

                return (
                  <button
                    key={label}
                    disabled={revealed}
                    onClick={() => onChoose(label)}
                    className={`${base} ${cls}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold">
                        {label}
                      </span>
                      <span className="text-gray-900">{choiceText}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Rationale (persists until navigation/reset) */}
            {revealed && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-1 text-sm font-semibold text-blue-800">
                  {isCorrect ? "Correct ✅" : "Not quite ❌"}
                </p>
                {current.rationale ? (
                  <p className="text-blue-900">{current.rationale}</p>
                ) : (
                  <p className="text-blue-900">No rationale provided for this item.</p>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={goPrev}
                disabled={idx === 0}
                className="rounded-xl border px-4 py-2 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="Prev (P)"
              >
                ← Prev
              </button>

              <div className="text-sm text-gray-500">
                {revealed ? "Press Next to continue" : "Choose an answer"}
              </div>

              <button
                onClick={goNext}
                disabled={idx >= total - 1}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Next (N)"
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
            No quiz deck found in <code>localStorage</code> at <code>quiz:deck</code>. Load your deck and refresh.
          </div>
        )}
      </section>
    </main>
  );
}
