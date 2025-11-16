// pages/quiz/runner.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

/* =========================
   Types
========================= */

type QuizItem = {
  id: string;
  domain?: string | null;
  subdomain: string; // e.g., "A3"
  statement?: string | null;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct_answer: string;
  rationale_correct?: string | null;
  rationale_a?: string | null;
  rationale_b?: string | null;
  rationale_c?: string | null;
  rationale_d?: string | null;
};

type ChoiceLetter = "A" | "B" | "C" | "D";

type FetchState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

/* =========================
   Domain / subdomain counts
========================= */

type DomainLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

const DOMAIN_COUNTS: Record<DomainLetter, number> = {
  A: 5,
  B: 24,
  C: 12,
  D: 9,
  E: 12,
  F: 8,
  G: 19,
  H: 8,
  I: 7,
};

const DEFAULT_LIMIT = 10;

/* =========================
   Helpers
========================= */

function parseCode(raw: string | string[] | undefined): {
  domain: DomainLetter | null;
  code: string | null;
  index: number | null;
} {
  if (!raw) return { domain: null, code: null, index: null };
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || s.length < 2) return { domain: null, code: null, index: null };

  const letter = s[0].toUpperCase() as DomainLetter;
  const num = Number(s.slice(1));
  if (!DOMAIN_COUNTS[letter] || !Number.isFinite(num) || num <= 0) {
    return { domain: null, code: null, index: null };
  }
  return { domain: letter, code: `${letter}${num}`, index: num };
}

function getNextSubdomainCode(
  domain: DomainLetter,
  index: number
): string | null {
  const max = DOMAIN_COUNTS[domain];
  if (!max) return null;
  if (index >= max) return null;
  return `${domain}${index + 1}`;
}

// localStorage helpers
function setLocalProgress(
  domain: DomainLetter,
  code: string,
  accuracyPercent: number
) {
  try {
    const doneKey = `quiz:done:${domain}:${code}`;
    const accKey = `quiz:accuracy:${domain}:${code}`;
    const lastKey = `quiz:lastCode:${domain}`;

    window.localStorage.setItem(doneKey, "1");

    const prev = window.localStorage.getItem(accKey);
    const prevNum = prev != null ? Number(prev) : null;
    const best =
      prevNum != null && Number.isFinite(prevNum)
        ? Math.max(prevNum, accuracyPercent)
        : accuracyPercent;
    window.localStorage.setItem(accKey, String(best));

    window.localStorage.setItem(lastKey, code);
  } catch {
    // ignore localStorage errors (Safari private mode, etc.)
  }
}

/* =========================
   Component
========================= */

export default function QuizRunnerPage() {
  const router = useRouter();
  const { domain, code, index: subIndex } = useMemo(
    () => parseCode(router.query.code),
    [router.query.code]
  );

  const [fetchState, setFetchState] = useState<FetchState>({
    status: "idle",
  });
  const [items, setItems] = useState<QuizItem[]>([]);

  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [selected, setSelected] = useState<ChoiceLetter | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Summary popup
  const [showSummary, setShowSummary] = useState(false);

  /* =========================
     Fetch questions for this code
  ========================= */

  useEffect(() => {
    if (!domain || !code) return;

    let cancelled = false;

    async function load() {
      setFetchState({ status: "loading" });
      setItems([]);
      setCurrentIdx(0);
      setAnsweredCount(0);
      setCorrectCount(0);
      setSelected(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setShowSummary(false);

      try {
        // 🔧 Build params safely (no nulls)
        const params = new URLSearchParams();
        if (domain) params.set("domain", domain);
        if (code) params.set("code", code);
        params.set("limit", String(DEFAULT_LIMIT));
        params.set("shuffle", "1");

        const res = await fetch(`/api/quiz/fetch?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Fetch failed with ${res.status}`);
        }
        const json = await res.json();
        const list: QuizItem[] = Array.isArray(json?.items)
          ? json.items
          : json?.data ?? [];

        if (!cancelled) {
          setItems(list);
          setFetchState({ status: "loaded" });
        }
      } catch (err: any) {
        if (!cancelled) {
          setFetchState({
            status: "error",
            message: err?.message || "Error loading questions.",
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [domain, code]);

  /* =========================
     Derived values
  ========================= */

  const totalQuestions = items.length;
  const current = items[currentIdx] ?? null;

  const accuracyPercent =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const domainTitle =
    (domain && getDomainTitle(domain)) ?? (domain ? `Domain ${domain}` : "");

  const subTitle = code ? getSubdomainText(code) ?? code : "";

  /* =========================
     Handlers
  ========================= */

  function handleAnswer(choice: ChoiceLetter) {
    if (!current || isAnswered) return; // don’t double-answer

    const correctChoice = (current.correct_answer || "").toUpperCase() as
      | "A"
      | "B"
      | "C"
      | "D";
    const correct = choice === correctChoice;

    setSelected(choice);
    setIsAnswered(true);
    setIsCorrect(correct);
    setAnsweredCount((n) => n + 1);
    if (correct) {
      setCorrectCount((n) => n + 1);
    }
  }

  function handleNextQuestion() {
    if (!isAnswered) return;
    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setIsAnswered(false);
      setIsCorrect(null);
    } else {
      // End of subdomain: store progress and show summary popup
      if (domain && code) {
        setLocalProgress(domain, code, accuracyPercent);
      }
      setShowSummary(true);
    }
  }

  function handleBackToToc() {
    router.push("/quiz");
  }

  function handleNextSubdomain() {
    if (!domain || subIndex == null) {
      router.push("/quiz");
      return;
    }
    const nextCode = getNextSubdomainCode(domain, subIndex);
    if (!nextCode) {
      // No more subdomains in this domain; go back to TOC
      router.push("/quiz");
      return;
    }
    router.push({
      pathname: "/quiz/runner",
      query: { code: nextCode },
    });
  }

  /* =========================
     Rationale rendering
  ========================= */

  function renderRationales() {
    if (!current || !isAnswered || !selected) return null;

    const choiceKey = `rationale_${selected.toLowerCase()}` as
      | "rationale_a"
      | "rationale_b"
      | "rationale_c"
      | "rationale_d";

    const selectedRationale = (current as any)[choiceKey] as
      | string
      | null
      | undefined;

    const generic = current.rationale_correct;

    return (
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        <p className="mb-1 font-semibold">
          You chose option {selected}.{" "}
          {isCorrect ? "That is correct. 🎉" : "That is not correct."}
        </p>
        {generic && (
          <p className="mb-1 whitespace-pre-line">
            {generic}
          </p>
        )}
        {selectedRationale && (
          <p className="mt-1 text-xs text-blue-900/80 whitespace-pre-line">
            Option {selected}: {selectedRationale}
          </p>
        )}
      </div>
    );
  }

  /* =========================
     Render
  ========================== */

  if (!domain || !code) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Quiz</h1>
        <p className="text-sm text-gray-600">
          No subdomain code was provided. Please go back to the quiz table of
          contents and choose a subdomain.
        </p>
        <button
          onClick={handleBackToToc}
          className="mt-4 rounded-md border px-4 py-2 text-sm"
        >
          Back to TOC
        </button>
      </main>
    );
  }

  if (fetchState.status === "loading" || fetchState.status === "idle") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-gray-600">Loading questions…</p>
      </main>
    );
  }

  if (fetchState.status === "error") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Quiz</h1>
        <p className="text-sm text-red-600 mb-3">
          {fetchState.message || "Error loading questions."}
        </p>
        <button
          onClick={handleBackToToc}
          className="mt-2 rounded-md border px-4 py-2 text-sm"
        >
          Back to TOC
        </button>
      </main>
    );
  }

  if (!current || totalQuestions === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Quiz</h1>
        <p className="text-sm text-gray-600">
          No questions were found for {code}. Please choose another subdomain.
        </p>
        <button
          onClick={handleBackToToc}
          className="mt-4 rounded-md border px-4 py-2 text-sm"
        >
          Back to TOC
        </button>
      </main>
    );
  }

  const questionNumber = currentIdx + 1;

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-8">
      {/* Summary popup */}
      {showSummary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-1">
              Subdomain complete – {code}
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Great work! Here’s how you did this round.
            </p>
            <div className="mb-4 rounded-lg border bg-gray-50 p-3 text-sm">
              <p>
                Correct:{" "}
                <span className="font-semibold">
                  {correctCount} / {answeredCount}
                </span>
              </p>
              <p>
                Accuracy:{" "}
                <span className="font-semibold">{accuracyPercent}%</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={handleBackToToc}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Back to TOC
              </button>
              <button
                onClick={handleNextSubdomain}
                className="rounded-md border bg-black px-3 py-1.5 text-sm font-semibold text-white"
              >
                Next subdomain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-6">
        <button
          onClick={handleBackToToc}
          className="mb-2 text-sm text-blue-700 underline-offset-2 hover:underline"
        >
          ← Back to TOC
        </button>

        <h1 className="text-3xl font-semibold mb-1">Quiz</h1>
        <p className="text-sm text-gray-700">
          <span className="font-semibold uppercase tracking-wide">
            DOMAIN {domain}
          </span>{" "}
          {domainTitle && <>· {domainTitle}</>} ·{" "}
          <span className="font-semibold">Subdomain {code}</span>
        </p>
        {subTitle && (
          <p className="mt-1 text-sm text-gray-600">{subTitle}</p>
        )}
      </header>

      {/* Progress bar */}
      <section className="mb-5 rounded-lg border p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">Progress</span>{" "}
            <span className="text-gray-600">
              · Answered {answeredCount} / {totalQuestions} · Question{" "}
              {questionNumber} of {totalQuestions}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Correct so far: {accuracyPercent}%
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
          <div
            className="h-2 rounded bg-blue-500 transition-all"
            style={{
              width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%`,
            }}
          />
        </div>
      </section>

      {/* Question */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {current.statement && (
          <p className="mb-3 text-sm text-gray-700 whitespace-pre-line">
            {current.statement}
          </p>
        )}
        <p className="mb-4 text-base font-medium text-gray-900 whitespace-pre-line">
          {current.question}
        </p>

        {/* Choices */}
        <div className="space-y-2">
          {(["A", "B", "C", "D"] as ChoiceLetter[]).map((letter) => {
            const key = letter.toLowerCase() as "a" | "b" | "c" | "d";
            const text = (current as any)[key] as string;
            const isSelected = selected === letter;
            const isCorrectChoice =
              (current.correct_answer || "").toUpperCase() === letter;

            let borderClass = "border-gray-300";
            let bgClass = "bg-white";
            if (isAnswered && isSelected) {
              borderClass = isCorrect ? "border-green-500" : "border-red-500";
              bgClass = isCorrect ? "bg-green-50" : "bg-red-50";
            } else if (isAnswered && isCorrectChoice) {
              borderClass = "border-green-400";
            }

            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleAnswer(letter)}
                disabled={isAnswered}
                className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
                  isAnswered ? "cursor-default" : "hover:bg-gray-50"
                } ${borderClass} ${bgClass}`}
              >
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                  {letter}
                </span>
                <span className="whitespace-pre-line">{text}</span>
              </button>
            );
          })}
        </div>

        {/* Rationale */}
        {renderRationales()}

        {/* Next button */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleNextQuestion}
            disabled={!isAnswered}
            className="rounded-md border bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {currentIdx + 1 < totalQuestions ? "Next question" : "Finish subdomain"}
          </button>
        </div>
      </section>
    </main>
  );
}
