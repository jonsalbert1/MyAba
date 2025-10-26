// pages/quiz/runner.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { useQuizProgress } from "@/lib/useQuizProgress";

type QuizItem = {
  id: string;
  domain?: string | null;
  subdomain: string;
  subdomain_text?: string | null;
  statement?: string | null;
  question: string;
  a: string; b: string; c: string; d: string;
  correct_answer: "A" | "B" | "C" | "D";
  rationale_correct?: string | null;
  rationale_a?: string | null;
  rationale_b?: string | null;
  rationale_c?: string | null;
  rationale_d?: string | null;
  created_at?: string | null;
};

type ApiResp = { ok: true; data: QuizItem[] } | { ok: false; error: string };

// Subdomain config
const COUNTS: Record<string, number> = {
  A: 5, B: 24, C: 12, D: 9, E: 12, F: 8, G: 19, H: 8, I: 7,
};
function makeCodes(letter: keyof typeof COUNTS) {
  const list: string[] = [];
  for (let i = 1; i <= COUNTS[letter]; i++) list.push(`${letter}${i}`);
  return list;
}
const SUBDOMAIN_CODES = (Object.keys(COUNTS) as Array<keyof typeof COUNTS>)
  .flatMap((letter) => makeCodes(letter));

function parseCode(code: string) {
  const letter = code.charAt(0).toUpperCase() as keyof typeof COUNTS;
  const num = Number(code.slice(1));
  return { letter, num };
}
function toCode(letter: keyof typeof COUNTS, num: number) {
  return `${letter}${num}`;
}
function clampNext(code: string): string {
  const { letter, num } = parseCode(code);
  const max = COUNTS[letter] ?? 1;
  const n = Math.min(max, Math.max(1, num + 1));
  return toCode(letter, n);
}
function clampPrev(code: string): string {
  const { letter, num } = parseCode(code);
  const n = Math.min(COUNTS[letter] ?? 1, Math.max(1, num - 1));
  return toCode(letter, n);
}
function isValidCode(c: string) {
  return SUBDOMAIN_CODES.includes(c);
}

export default function QuizRunner() {
  const router = useRouter();

  // 🔐 Auth guard
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        setAuthed(false);
        router.replace("/");
        return;
      }
      setAuthed(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/");
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [router]);

  // Params & state
  const initialCode = (() => {
    const q = router.query?.code;
    if (typeof q === "string" && isValidCode(q)) return q;
    return "A1";
  })();

  const [code, setCode] = useState<string>(initialCode);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | undefined>>({});
  const [showRationales, setShowRationales] = useState<Record<string, boolean>>({});
  const [finishMsg, setFinishMsg] = useState<string | null>(null);

  const domainLetter = (code.charAt(0).toUpperCase() as any) || "A";
  const { currentLast, done, accuracy, actions } = useQuizProgress(domainLetter, code);

  // Derived metrics
  const correctCount = useMemo(
    () =>
      items.reduce((acc, q) => acc + ((answers[q.id] ?? "") === q.correct_answer ? 1 : 0), 0),
    [items, answers]
  );
  const answeredCount = useMemo(
    () => items.reduce((acc, q) => acc + (answers[q.id] ? 1 : 0), 0),
    [items, answers]
  );
  const allAnswered = items.length > 0 && answeredCount === items.length;
  const percent = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;

  const progressPercent = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
  const correctSoFarPercent = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;

  // ✅ Updated load() with session check to avoid 401s
  async function load(currCode = code, currLimit = limit) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quiz?code=${encodeURIComponent(currCode)}&limit=${currLimit}`,
        { cache: "no-store" }
      );
      const json: ApiResp = await res.json();
      if (!("ok" in json) || !json.ok) throw new Error((json as any)?.error || "Unknown error");

      // set state
      setItems(json.data);
      setAnswers({});
      setShowRationales({});
      actions.setLast(currCode);

      // store last code for dashboard updates
      try {
        localStorage.setItem(`quiz:lastCode:${currCode[0]}`, currCode);
        window.dispatchEvent(new Event("quiz-progress-updated"));
      } catch {}

      // 🔐 only upsert if logged in
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        await fetch("/api/progress/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currCode,
            domain: currCode[0],
            done: false,
            best_accuracy: accuracy,
          }),
        }).catch((err) => {
          console.warn("Progress upsert failed (non-fatal):", err);
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load quiz.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    const q = router.query?.code;
    if (typeof q === "string" && q !== code && isValidCode(q)) {
      setCode(q);
      load(q, limit);
      return;
    }
    load(code, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, router.query?.code]);

  // Selection handlers
  function handleSelect(qid: string, choice: "A" | "B" | "C" | "D") {
    setAnswers((prev) => ({ ...prev, [qid]: choice }));
  }
  function toggleRationales(qid: string) {
    setShowRationales((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }
  function updateUrlAndLoad(nextCode: string) {
    router.replace({ pathname: "/quiz/runner", query: { code: nextCode } }, undefined, { shallow: true });
    setCode(nextCode);
    load(nextCode, limit);
  }

  // DEV panel state
  const [devKeys, setDevKeys] = useState<{ last?: string; done?: string; acc?: string }>({});
  function readDevKeys() {
    try {
      const last = localStorage.getItem(`quiz:lastCode:${domainLetter}`) ?? "";
      const doneK = localStorage.getItem(`quiz:done:${domainLetter}:${code}`) ?? "";
      const acc  = localStorage.getItem(`quiz:accuracy:${domainLetter}`) ?? "";
      setDevKeys({ last, done: doneK, acc });
    } catch { setDevKeys({}); }
  }
  function forceWrite() {
    try {
      localStorage.setItem(`quiz:lastCode:${domainLetter}`, code);
      localStorage.setItem(`quiz:done:${domainLetter}:${code}`, "1");
      localStorage.setItem(`quiz:accuracy:${domainLetter}`, "88");
      window.dispatchEvent(new Event("quiz-progress-updated"));
    } catch {}
    readDevKeys();
  }
  useEffect(() => { readDevKeys(); }, [code, domainLetter]);

  // Utilities
  function startAtFirstInDomain() {
    const first = `${code[0]}1`;
    router.replace({ pathname: "/quiz/runner", query: { code: first } }, undefined, { shallow: true });
    setCode(first);
    load(first, limit);
  }
  function resetDomainProgress() {
    const domain = code[0];
    try {
      localStorage.removeItem(`quiz:accuracy:${domain}`);
      localStorage.removeItem(`quiz:lastCode:${domain}`);
      const max = COUNTS[domain as keyof typeof COUNTS] ?? 0;
      for (let i = 1; i <= max; i++) {
        const sub = `${domain}${i}`;
        localStorage.removeItem(`quiz:done:${domain}:${sub}`);
      }
      window.dispatchEvent(new Event("quiz-progress-updated"));
    } catch {}
    alert(`Reset progress for domain ${domain}.`);
    startAtFirstInDomain();
  }

  // Sticky header shadow for mobile
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Finish & persist
  async function onFinishSubdomain() {
    const pct = percent;

    // Local storage + hook
    try {
      localStorage.setItem(`quiz:lastCode:${code[0]}`, code);
      localStorage.setItem(`quiz:done:${code[0]}:${code}`, "1");
      localStorage.setItem(`quiz:accuracy:${code[0]}`, String(pct));
      window.dispatchEvent(new Event("quiz-progress-updated"));
    } catch {}

    actions.markDone();
    actions.setAccuracy(pct);

    // Server persist (session-gated)
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        await fetch("/api/progress/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, domain: code[0], done: true, best_accuracy: pct }),
        });
      }
    } catch (err) {
      console.warn("Progress upsert failed (finish):", err);
    }

    setFinishMsg(`Saved: ${code} • ${pct}%`);
    setTimeout(() => setFinishMsg(null), 2000);

    // Auto-advance
    const next = clampNext(code);
    if (next !== code) updateUrlAndLoad(next);
  }

  function onNext() { updateUrlAndLoad(clampNext(code)); }
  function onPrev() { updateUrlAndLoad(clampPrev(code)); }

  if (authed === null) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Quiz</h1>
          <p className="text-sm text-gray-600">Pick a subdomain and load questions. Your selections give instant feedback.</p>
          <div className="mt-2 text-xs text-gray-500">
            Last in this domain: <strong>{currentLast ?? "—"}</strong> · {done ? "✅ Completed" : "Not completed"} · Accuracy <strong>{accuracy}%</strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/quiz" className="text-sm underline underline-offset-2 hover:opacity-80">← Back to TOC</a>
        </div>
      </header>

      {/* Top progress card (mobile sticky, desktop static) */}
      <div
        className={[
          "mb-5 rounded-lg border p-3",
          "sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/80 bg-white/95",
          "md:static md:backdrop-blur-0 md:bg-transparent",
          scrolled ? "shadow-sm md:shadow-none" : ""
        ].join(" ")}
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <div>
            <span className="font-medium">Progress</span>{" "}
            <span className="text-gray-600">
              • Answered <strong>{answeredCount}</strong> / {items.length}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Correct so far: <strong>{correctSoFarPercent}%</strong>
          </div>
        </div>

        {/* Primary bar = answered */}
        <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
          <div
            className="h-2 rounded bg-blue-500 transition-all"
            style={{ width: `${progressPercent}%` }}
            aria-label="Answered progress"
          />
        </div>

        {/* Secondary bar = correct so far */}
        <div className="mt-2 h-1 w-full rounded bg-gray-100 overflow-hidden">
          <div
            className="h-1 rounded bg-green-500 transition-all"
            style={{ width: `${correctSoFarPercent}%` }}
            aria-label="Correct so far"
          />
        </div>

        {/* Chips under bars */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-gray-700"
            aria-label="Answered chip"
            title="How many questions you answered"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Answered {answeredCount}/{items.length}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-gray-700"
            aria-label="Correct chip"
            title="Percent correct"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Correct {correctSoFarPercent}%
          </span>
        </div>
      </div>

      {/* DEV panel */}
      <details className="mb-4 rounded-lg border bg-yellow-50 p-3 text-xs">
        <summary className="cursor-pointer font-semibold">DEV: Runner progress keys</summary>
        <div className="mt-2 grid grid-cols-1 gap-1 font-mono break-all">
          <div>code: <b>{code}</b> · domainLetter: <b>{domainLetter}</b></div>
          <div>quiz:lastCode:{domainLetter}: <b>{devKeys.last || "—"}</b></div>
          <div>quiz:done:{domainLetter}:{code}: <b>{devKeys.done || "—"}</b></div>
          <div>quiz:accuracy:{domainLetter}: <b>{devKeys.acc || "—"}</b></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={readDevKeys} className="rounded border px-2 py-1">Reload Keys</button>
          <button type="button" onClick={forceWrite} className="rounded border px-2 py-1">Force Write</button>
          <button type="button" onClick={startAtFirstInDomain} className="rounded border px-2 py-1">Start at {code[0]}1</button>
          <button type="button" onClick={resetDomainProgress} className="rounded border px-2 py-1">Reset {code[0]} progress</button>
        </div>
      </details>

      {finishMsg && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
          {finishMsg}
        </div>
      )}

      {/* Control bar */}
      <section className="mb-4">
        <div className="rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Loaded: <strong>{items.length}</strong> items for <strong>{code}</strong></span>
            <span>
              Score (selected): <strong>{correctCount}</strong> / {items.length}
              <span className="mx-2 text-gray-400">•</span>
              Answered: <strong>{answeredCount}</strong> / {items.length}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="text-sm">
              Code
              <select
                className="ml-2 rounded border px-2 py-1"
                value={code}
                onChange={(e) => updateUrlAndLoad(e.target.value)}
              >
                {SUBDOMAIN_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="text-sm">
              Limit
              <input
                type="number" min={1} max={50}
                className="ml-2 w-20 rounded border px-2 py-1"
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </label>

            <button
              type="button"
              onClick={() => load(code, limit)}
              disabled={loading}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              {loading ? "Loading…" : "Load"}
            </button>

            <button
              type="button"
              onClick={onPrev}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Previous subdomain"
            >
              ← Prev
            </button>

            <button
              type="button"
              onClick={onFinishSubdomain}
              disabled={!allAnswered || loading}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mark complete and save accuracy"
            >
              {allAnswered ? "✅ Finish Subdomain" : `Answer all (${answeredCount}/${items.length})`}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Next subdomain"
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* Quiz items */}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">Error: {error}</div>}
      {!error && !loading && items.length === 0 && <p className="text-gray-600">No questions found for {code}.</p>}

      <ol className="space-y-6 list-decimal ml-6">
        {items.map((q) => {
          const selected = answers[q.id];
          const isCorrect = selected && selected === q.correct_answer;
          const choiceList = [
            { key: "A", text: q.a, rationale: q.rationale_a },
            { key: "B", text: q.b, rationale: q.rationale_b },
            { key: "C", text: q.c, rationale: q.rationale_c },
            { key: "D", text: q.d, rationale: q.rationale_d },
          ] as const;

          return (
            <li key={q.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-end">
                {selected && (
                  <div className={"text-xs font-semibold " + (isCorrect ? "text-green-600" : "text-red-600")}>
                    {isCorrect ? "Correct" : `Incorrect (Answer: ${q.correct_answer})`}
                  </div>
                )}
              </div>

              {q.statement && <p className="mb-2 italic text-gray-700">{q.statement}</p>}
              <p className="mb-3 font-medium">
                {String(q.question ?? "").replace(/^\s*\d+\.\s*/, "")}
              </p>

              <div role="radiogroup" className="space-y-2">
                {choiceList.map((c) => {
                  const chosen = selected === (c.key as any);
                  const borderClass =
                    selected &&
                    ((c.key === q.correct_answer && "border-green-400") ||
                      (chosen && c.key !== q.correct_answer && "border-red-300")) ||
                    "border-gray-200";

                  return (
                    <label
                      key={c.key}
                      className={"flex cursor-pointer items-start gap-2 rounded-md border p-2 transition " + borderClass + " hover:bg-gray-50"}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={c.key}
                        checked={chosen}
                        onChange={() => handleSelect(q.id, c.key as "A" | "B" | "C" | "D")}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-semibold mr-1">{c.key}.</span>
                        {c.text}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button type="button" onClick={() => toggleRationales(q.id)} className="text-sm underline underline-offset-2 hover:opacity-80">
                  {showRationales[q.id] ? "Hide rationales" : "Show rationales"}
                </button>
                {selected && <span className="text-sm text-gray-600">Selected: <strong>{selected}</strong></span>}
              </div>

              {showRationales[q.id] && (
                <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
                  <p className="mb-2"><span className="font-semibold">Why the correct answer is correct:</span> {q.rationale_correct || "—"}</p>
                  <ul className="space-y-1">
                    {choiceList.map((c) => (
                      <li key={c.key}><span className="font-semibold">{c.key}:</span> {c.rationale ?? "—"}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Sticky results bar when all answered */}
      {allAnswered && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[95%] max-w-2xl -translate-x-1/2 rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">You’re done!</div>
              <div>
                Score: <strong>{correctCount}</strong> / {items.length} ({percent}%)
              </div>

              {/* Progress chips */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-gray-700"
                  aria-label="Answered chip"
                  title="How many questions you answered"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Answered {answeredCount}/{items.length}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-gray-700"
                  aria-label="Correct chip"
                  title="Percent correct"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Correct {percent}%
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onFinishSubdomain}
                className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90"
                title="Save your score and go to the next subdomain"
              >
                Save & Next ({clampNext(code)})
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
