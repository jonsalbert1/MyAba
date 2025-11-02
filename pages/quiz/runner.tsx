// pages/quiz/runner.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { useQuizProgress } from "@/lib/useQuizProgress";

/* =========================
   Types
========================= */
type QuizItem = {
  id: string;
  domain?: string | null;
  subdomain: string;
  statement?: string | null;
  question: string;
  a: string; b: string; c: string; d: string;
  correct_answer: string;
  rationale_correct?: string | null;
  rationale_a?: string | null;
  rationale_b?: string | null;
  rationale_c?: string | null;
  rationale_d?: string | null;
};

/* =========================
   Helpers / constants
========================= */
const COUNTS: Record<string, number> = { A:5, B:24, C:12, D:9, E:12, F:8, G:19, H:8, I:7 };
const SUBDOMAIN_CODES = Object.keys(COUNTS).flatMap((L) =>
  Array.from({ length: COUNTS[L as keyof typeof COUNTS] }, (_, i) => `${L}${i + 1}`)
);

const normCode = (v: any) => String(v ?? "A1").toUpperCase();
const isValidCode = (c: string) => SUBDOMAIN_CODES.includes(c.toUpperCase());
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const normChoice = (v: any): "A" | "B" | "C" | "D" | undefined => {
  const m = String(v ?? "").toUpperCase().match(/[ABCD]/);
  return (m?.[0] as any) || undefined;
};
const nextCode = (c: string) => {
  const L = c[0].toUpperCase();
  const n = Number(c.slice(1)) || 1;
  const max = COUNTS[L] || 1;
  return `${L}${Math.min(max, n + 1)}`;
};
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** ✅ Narrow the domain letter to the exact union that useQuizProgress expects */
type DomainLetter = "A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"I";
function toDomainLetter(s: string): DomainLetter {
  const L = (s?.charAt(0) ?? "A").toUpperCase();
  return (["A","B","C","D","E","F","G","H","I"] as const).includes(L as DomainLetter)
    ? (L as DomainLetter)
    : "A";
}

/* =========================
   Component
========================= */
export default function QuizRunner() {
  const router = useRouter();
  const initial = isValidCode(normCode(router.query.code)) ? normCode(router.query.code) : "A1";

  // Per-domain “round” to vary server shuffle seeds
  const [roundId, setRoundId] = useState<number>(0);
  useEffect(() => {
    const L = initial[0].toUpperCase();
    const raw = localStorage.getItem(`quiz:round:${L}`);
    const n = raw ? Number(raw) : 0;
    setRoundId(Number.isFinite(n) ? n : 0);
  }, [initial]);

  // Auth presence (for /api/progress/*)
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setHasSession(Boolean(data.session));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  // URL / params
  const [code, setCode] = useState(initial);
  const letter: DomainLetter = toDomainLetter(code);           // ⬅️ narrowed type
  const { actions } = useQuizProgress(letter, code);

  // Controls
  const [limit, setLimit] = useState(10);
  const [shuffle, setShuffle] = useState(true);

  // Data
  const [items, setItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single-question state
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | undefined>>({});
  const [showRationales, setShowRationales] = useState<Record<string, boolean>>({});
  const [finishMsg, setFinishMsg] = useState<string | null>(null);

  // Local subdomain snapshot (for header line)
  const [subLocalAcc, setSubLocalAcc] = useState<number | null>(null);
  const [subLocalDone, setSubLocalDone] = useState<boolean>(false);
  useEffect(() => {
    try {
      const a = localStorage.getItem(`quiz:accuracy:${letter}:${code}`);
      const d = localStorage.getItem(`quiz:done:${letter}:${code}`) === "1";
      setSubLocalAcc(a ? Number(a) : null);
      setSubLocalDone(d);
    } catch {
      setSubLocalAcc(null);
      setSubLocalDone(false);
    }
  }, [code, letter]);

  // Metrics
  const answeredCount = useMemo(
    () => items.reduce((acc, q) => acc + (answers[String(q.id)] ? 1 : 0), 0),
    [items, answers]
  );
  const correctCount = useMemo(
    () =>
      items.reduce((acc, q) => {
        const sel = normChoice(answers[String(q.id)]);
        const ans = normChoice(q.correct_answer);
        return acc + (sel && ans && sel === ans ? 1 : 0);
      }, 0),
    [items, answers]
  );
  const percent = items.length ? Math.round((correctCount / items.length) * 100) : 0;
  const allAnswered = items.length > 0 && answeredCount === items.length;

  // Abort controller
  const loadAbortRef = useRef<AbortController | null>(null);

  async function saveProgressToAPI(opts: {
    subdomain: string;
    done: boolean;
    best_accuracy?: number | null;
    last_index?: number | null;
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await fetch("/api/progress/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subdomain: opts.subdomain,
          done: opts.done,
          best_accuracy: typeof opts.best_accuracy === "number" ? opts.best_accuracy : null,
          last_index: typeof opts.last_index === "number" ? opts.last_index : 0,
        }),
      });
    } catch {
      /* ignore */
    }
  }

  async function load(currCode = code, currLimit = limit, doShuffle = shuffle) {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;

    setLoading(true);
    setError(null);
    try {
      const seed = `${letter}-${roundId}`;
      const url1 =
        `/api/quiz/fetch?domain=${letter}&code=${encodeURIComponent(currCode)}&limit=${currLimit}` +
        (doShuffle ? `&shuffle=1&seed=${encodeURIComponent(seed)}` : "");
      let res = await fetch(url1, { cache: "no-store", signal: ac.signal });
      let parsed: any = null;
      try {
        parsed = await res.json();
      } catch {
        parsed = {};
      }

      let rows: QuizItem[] = [];
      if (Array.isArray(parsed)) rows = parsed;
      else if (parsed?.ok && Array.isArray(parsed.data)) rows = parsed.data;

      if (!rows.length) {
        const fb = `/api/quiz?code=${encodeURIComponent(currCode)}&limit=${currLimit}`;
        const r2 = await fetch(fb, { cache: "no-store", signal: ac.signal });
        const j2: any = await r2.json().catch(() => ({}));
        if (j2?.ok && Array.isArray(j2.data)) rows = j2.data;
      }
      if (ac.signal.aborted) return;

      if (!rows.length) {
        setItems([]);
        setAnswers({});
        setShowRationales({});
        setQIndex(0);
        actions.setLast(currCode);
        setError(`No questions found for ${currCode}.`);
        return;
      }

      // Normalize correct_answer to one of A/B/C/D
      const normalized = rows.map((r) => ({
        ...r,
        correct_answer: normChoice(r.correct_answer) ?? r.correct_answer,
      }));

      setItems(normalized);
      setAnswers({});
      setShowRationales({});
      setQIndex(0);
      actions.setLast(currCode);

      try {
        localStorage.setItem(`quiz:lastCode:${currCode[0]}`, currCode);
        window.dispatchEvent(new Event("quiz-progress-updated"));
      } catch {}

      if (hasSession) {
        await saveProgressToAPI({
          subdomain: currCode,
          done: false,
          best_accuracy: subLocalAcc ?? null,
          last_index: 0,
        });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Failed to load quiz.");
    } finally {
      if (!loadAbortRef.current?.signal.aborted) setLoading(false);
    }
  }

  // Initial and when code (URL) changes
  useEffect(() => {
    if (!router.isReady) return;
    const raw = normCode(router.query.code);
    const safe = isValidCode(raw) ? raw : "A1";
    setCode(safe);
    load(safe, limit, shuffle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.code]);

  // Current Q
  const current = items[qIndex];
  const selected = current ? answers[String(current.id)] : undefined;
  const correctKey = current ? normChoice(current.correct_answer) : undefined;
  const isCorrect = Boolean(selected && correctKey && selected === correctKey);

  // Answer handler
  function handleSelect(qid: string, choice: "A" | "B" | "C" | "D") {
    setAnswers((prev) => ({ ...prev, [qid]: choice }));
    if (!current) return;

    const right = normChoice(current.correct_answer);
    if (choice === right) {
      const next = qIndex + 1;
      // brief delay so user sees the green state
      setTimeout(() => {
        if (next < items.length) setQIndex(next);
        // last question => sticky save bar will appear
      }, 420);
    } else {
      setShowRationales((prev) => ({ ...prev, [qid]: true }));
    }
  }

  // Debounced autosave of last answered index
  useEffect(() => {
    if (!items.length || !hasSession) return;
    const lastIdx = Math.max(
      0,
      items.reduce((last, q, i) => (answers[String(q.id)] ? i : last), -1)
    );
    const run = debounce(async () => {
      await saveProgressToAPI({
        subdomain: code,
        done: false,
        best_accuracy: subLocalAcc ?? null,
        last_index: lastIdx,
      });
    }, 700);
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, items, hasSession, code]);

  // Finish & auto-advance to next subdomain
  async function finishSubdomain() {
    try {
      localStorage.setItem(`quiz:lastCode:${letter}`, code);
      localStorage.setItem(`quiz:done:${letter}:${code}`, "1");
      localStorage.setItem(`quiz:accuracy:${letter}:${code}`, String(percent));
      window.dispatchEvent(new Event("quiz-progress-updated"));
      setSubLocalAcc(percent);
      setSubLocalDone(true);
    } catch {}

    actions.markDone();
    actions.setAccuracy(percent);

    if (hasSession) {
      await saveProgressToAPI({
        subdomain: code,
        done: true,
        best_accuracy: percent,
        last_index: Math.max(0, (items?.length ?? 1) - 1),
      });
    }

    setFinishMsg(`Saved ${code} • ${percent}%`);
    setTimeout(() => setFinishMsg(null), 1200);

    const nxt = nextCode(code);
    router.replace({ pathname: "/quiz/runner", query: { code: nxt } });
  }

  // Keyboard shortcuts: 1–4 answer, N to advance on wrong/after viewing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      const map: Record<string, "A" | "B" | "C" | "D"> = {
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
      };
      if (map[e.key]) {
        e.preventDefault();
        handleSelect(String(current.id), map[e.key]);
      } else if (e.key.toLowerCase() === "n") {
        // advance manually when wrong or after viewing rationales
        if (selected && selected !== correctKey) {
          setQIndex((i) => Math.min(items.length - 1, i + 1));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, selected, correctKey, items.length]);

  // UI helpers
  const progressPercent = items.length ? Math.round((answeredCount / items.length) * 100) : 0;
  const correctSoFarPercent = items.length ? Math.round((correctCount / items.length) * 100) : 0;

  /* =========================
     Render
  ========================= */
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header (subtitle removed as requested) */}
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quiz</h1>
          <div className="mt-1 text-sm text-gray-600">
            Subdomain <strong>{code}</strong> · {subLocalDone ? "✅ Completed" : "Not completed"} · Accuracy{" "}
            <strong>{subLocalAcc != null ? `${subLocalAcc}%` : "—"}</strong>
          </div>
        </div>
        <a href="/quiz" className="text-sm underline underline-offset-2 hover:opacity-80">
          ← Back to TOC
        </a>
      </header>

      {/* Progress card */}
      <section className="mb-5 rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">Progress</span>{" "}
            <span className="text-gray-600">
              • Answered <strong>{answeredCount}</strong> / {items.length}
              {items.length > 0 && (
                <>
                  {" "}
                  <span className="mx-1 text-gray-400">•</span> Question <strong>{qIndex + 1}</strong> of {items.length}
                </>
              )}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Correct so far: <strong>{correctSoFarPercent}%</strong>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
          <div className="h-2 rounded bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded bg-gray-100">
          <div className="h-1 rounded bg-green-500 transition-all" style={{ width: `${correctSoFarPercent}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Code
            <select
              className="ml-2 rounded border px-2 py-1"
              value={code}
              onChange={(e) => router.replace({ pathname: "/quiz/runner", query: { code: e.target.value } })}
            >
              {SUBDOMAIN_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

        <label className="text-sm">
            Limit
            <input
              type="number"
              min={1}
              max={50}
              className="ml-2 w-20 rounded border px-2 py-1"
              value={limit}
              onChange={(e) => setLimit(clamp(Number(e.target.value) || 1, 1, 50))}
            />
          </label>

          <button
            type="button"
            onClick={() => load(code, limit, shuffle)}
            disabled={loading}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            {loading ? "Loading…" : "Load"}
          </button>

          <label className="ml-auto inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => {
                setShuffle(e.target.checked);
                load(code, limit, e.target.checked);
              }}
            />
            Shuffle
          </label>
        </div>
      </section>

      {finishMsg && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
          {finishMsg}
        </div>
      )}

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">Error: {error}</div>}

      {!error && !loading && items.length === 0 && (
        <div className="rounded-md border p-3 text-sm">
          <p className="text-gray-700">
            No questions found for <strong>{code}</strong>.
          </p>
        </div>
      )}

      {/* Single question (no <ol>/<li> => no stray “1.”) */}
      {current && (
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <div className="text-gray-500">
              Question {qIndex + 1} of {items.length}
            </div>
            {selected && (
              <div className={"font-semibold " + (isCorrect ? "text-green-600" : "text-red-600")}>
                {isCorrect ? "Correct" : `Incorrect (Answer: ${normChoice(current.correct_answer)})`}
              </div>
            )}
          </div>

          {current.statement && <p className="mb-2 italic text-gray-700">{current.statement}</p>}
          <p className="mb-3 font-medium">{String(current.question ?? "").replace(/^\s*\d+\.\s*/, "")}</p>

          <div role="radiogroup" className="space-y-2">
            {(["A", "B", "C", "D"] as const).map((k) => {
              const txt = (current as any)[k.toLowerCase()];
              const chosen = selected === k;
              const right = normChoice(current.correct_answer);
              const borderClass =
                selected &&
                ((k === right && "border-green-400") || (chosen && k !== right && "border-red-300")) ||
                "border-gray-200";
              return (
                <label
                  key={k}
                  className={
                    "flex cursor-pointer items-start gap-2 rounded-md border p-2 transition " +
                    borderClass +
                    " hover:bg-gray-50"
                  }
                >
                  <input
                    type="radio"
                    name={`q-${String(current.id)}`}
                    value={k}
                    checked={chosen}
                    onChange={() => handleSelect(String(current.id), k)}
                    className="mt-1"
                  />
                  <span>
                    <span className="mr-1 font-semibold">{k}.</span>
                    {txt}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Wrong answer helpers */}
          {selected && !isCorrect && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowRationales((prev) => ({ ...prev, [String(current.id)]: !prev[String(current.id)] }))
                }
                className="text-sm underline underline-offset-2 hover:opacity-80"
              >
                {showRationales[String(current.id)] ? "Hide rationales" : "Show rationales"}
              </button>

              <button
                type="button"
                onClick={() => setQIndex((i) => Math.min(items.length - 1, i + 1))}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                title="Next question"
              >
                Next question →
              </button>
            </div>
          )}

          {showRationales[String(current.id)] && (
            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
              <p className="mb-2">
                <span className="font-semibold">Why the correct answer is correct:</span>{" "}
                {current.rationale_correct || "—"}
              </p>
              <ul className="space-y-1">
                {(["A", "B", "C", "D"] as const).map((k) => (
                  <li key={k}>
                    <span className="font-semibold">{k}:</span>{" "}
                    {(current as any)[`rationale_${k.toLowerCase()}`] ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sticky results bar */}
      {allAnswered && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[95%] max-w-2xl -translate-x-1/2 rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">You’re done!</div>
              <div>
                Score: <strong>{correctCount}</strong> / {items.length} ({percent}%)
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={finishSubdomain}
                className="rounded-md border bg-black px-3 py-1.5 text-sm text-white hover:opacity-90"
                title="Save your score and go to the next subdomain"
              >
                Save & Next ({nextCode(code)})
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                title="Scroll to review your answers"
              >
                Review answers
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
