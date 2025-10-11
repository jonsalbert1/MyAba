// pages/flashcards.tsx
import { useCallback, useEffect, useMemo, useState } from "react";

type Card = { term: string; def: string };

function readDeck(): Card[] {
  try {
    const raw = localStorage.getItem("flashcards:deck");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .map((x) => ({ term: String(x.term ?? ""), def: String(x.def ?? "") }))
        .filter((x) => x.term && x.def);
    }
    return [];
  } catch {
    return [];
  }
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function FlashcardsPage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Load deck once
  useEffect(() => {
    const d = readDeck();
    if (d.length === 0) {
      // Friendly demo so the page renders
      const demo: Card[] = [
        { term: "Positive Reinforcement", def: "Adding a stimulus after a response that increases future responding." },
        { term: "Extinction", def: "Withholding reinforcement for a previously reinforced response." },
      ];
      setDeck(demo);
      // also set so Dashboard can count
      localStorage.setItem("flashcards:deck", JSON.stringify(demo));
    } else {
      setDeck(d);
    }
  }, []);

  const total = deck.length;
  const current = deck[idx];

  const goNext = useCallback(() => {
    if (!total) return;
    setFlipped(false);
    setIdx((i) => (i + 1 < total ? i + 1 : i));
  }, [total]);

  const goPrev = useCallback(() => {
    if (!total) return;
    setFlipped(false);
    setIdx((i) => (i - 1 >= 0 ? i - 1 : i));
  }, [total]);

  const doFlip = useCallback(() => {
    if (!total) return;
    setFlipped((f) => !f);
  }, [total]);

  const doReset = useCallback(() => {
    setIdx(0);
    setFlipped(false);
  }, []);

  const doShuffle = useCallback(() => {
    if (!total) return;
    const s = shuffle(deck);
    setDeck(s);
    setIdx(0);
    setFlipped(false);
    // keep dashboard consistent
    localStorage.setItem("flashcards:deck", JSON.stringify(s));
  }, [deck, total]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "enter") {
        e.preventDefault();
        doFlip();
      } else if (k === "n") {
        goNext();
      } else if (k === "p") {
        goPrev();
      } else if (k === "r") {
        doReset();
      } else if (k === "s") {
        doShuffle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doFlip, goNext, goPrev, doReset, doShuffle]);

  const progressPct = useMemo(() => (total ? Math.round(((idx + 1) / total) * 100) : 0), [idx, total]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Page title row (under global NavBar) */}
      <section className="mx-auto max-w-5xl px-6 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Flashcards</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={doShuffle}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
              title="Shuffle (S)"
            >
              Shuffle
            </button>
            <button
              onClick={doReset}
              className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
              title="Reset (R)"
            >
              Reset
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600">Shortcuts: Space/Enter = flip, N = next, P = prev, S = shuffle, R = reset</p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {total ? `Card ${idx + 1} of ${total} (${progressPct}%)` : "No cards loaded"}
          </p>
        </div>

        {/* Card */}
        {current ? (
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <div className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">Term / Definition</div>

            <div
              onClick={doFlip}
              className="cursor-pointer select-none rounded-2xl border p-8 text-center transition hover:bg-gray-50"
              title="Click to flip (Space/Enter)"
            >
              {!flipped ? (
                <>
                  <div className="mb-2 text-xs font-semibold text-blue-700">TERM</div>
                  <div className="text-xl font-semibold text-gray-900">{current.term}</div>
                  <div className="mt-3 text-xs text-gray-500">Click to see definition</div>
                </>
              ) : (
                <>
                  <div className="mb-2 text-xs font-semibold text-green-700">DEFINITION</div>
                  <div className="text-lg text-gray-900">{current.def}</div>
                  <div className="mt-3 text-xs text-gray-500">Click to go back</div>
                </>
              )}
            </div>

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

              <button
                onClick={doFlip}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                title="Flip (Space/Enter)"
              >
                Flip
              </button>

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
            No deck found in <code>localStorage</code> at <code>flashcards:deck</code>.
            Use the <strong>Upload</strong> page to load CSV/JSON.
          </div>
        )}
      </section>
    </main>
  );
}
