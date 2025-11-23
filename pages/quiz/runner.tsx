// pages/quiz/runner.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

/* =========================
   Types
========================= */

type QuizItem = {
  id: string;
  domain?: string | null;
  subdomain: string; // e.g., "C06"
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct_answer: string;
  rationale_correct?: string | null;
  // NEW: optional image path from Supabase
  image_path?: string | null;
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
  return { domain: letter, code: `${letter}${num.toString().padStart(2, "0")}`, index: num };
}

function getNextSubdomainCode(
  domain: DomainLetter,
  index: number
): string | null {
  const max = DOMAIN_COUNTS[domain];
  if (!max) return null;
  if (index >= max) return null;
  return `${domain}${(index + 1).toString().padStart(2, "0")}`;
}

// Local progress
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
    // ignore localStorage issues
  }
}

// Save to server
async function saveProgressToServer(
  domain: DomainLetter,
  code: string,
  accuracyPercent: number,
  answeredCount: number,
  correctCount: number,
  completed: boolean
) {
  try {
    const res = await fetch("/api/quiz/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain,
        subdomain: code,
        accuracy_percent: accuracyPercent,
        answered_count: answeredCount,
        correct_count: correctCount,
        completed,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      console.warn("Quiz progress save failed", json || res.statusText);
    }
  } catch (err) {
    console.warn("Quiz progress save error", err);
  }
}

/**
 * Build a full image URL for quiz images.
 * Set NEXT_PUBLIC_QUIZ_IMAGE_BASE_URL in your env, e.g.:
 * https://YOUR-PROJECT.supabase.co/storage/v1/object/public/quiz-images
 */
function buildImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_QUIZ_IMAGE_BASE_URL;
  if (!base) {
    // Fallback: if you ever store full URLs directly in image_path
    return imagePath;
  }
  const sep = base.endsWith("/") ? "" : "/";
  return `${base}${sep}${imagePath}`;
}

/* =========================
   Component
========================= */

export default function QuizRunnerPage() {
  const router = useRouter();
  const user = useUser();
  const { domain, code, index: subIndex } = useMemo(
    () => parseCode(router.query.code),
    [router.query.code]
  );

  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [items, setItems] = useState<QuizItem[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [selected, setSelected] = useState<ChoiceLetter | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [showSummary, setShowSummary] = useState(false);

  // Fetch questions
  useEffect(() => {
    if (!domain || !code) return;
    if (user === undefined) return;
    if (!user) return;

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
        const params = new URLSearchParams({
          domain: domain || "",
          code: code || "",
          limit: String(DEFAULT_LIMIT),
          shuffle: "1",
        });

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

    void load();
    return () => {
      cancelled = true;
    };
  }, [domain, code, user]);

  const totalQuestions = items.length;
  const current = items[currentIdx] ?? null;

  const accuracyPercent =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const domainTitle =
    (domain && getDomainTitle(domain)) ?? (domain ? `Domain ${domain}` : "");
  const subTitle = code ? getSubdomainText(code) ?? code : "";

  function handleAnswer(choice: ChoiceLetter) {
    if (!current || isAnswered) return;

    const correctChoice = (current.correct_answer || "").toUpperCase() as
      | "A"
      | "B"
      | "C"
      | "D";
    const correct = choice === correctChoice;

    setSelected(choice);
    setIsAnswered(true);
    setIsCorrect(correct);

    const nextAnswered = answeredCount + 1;
    const nextCorrect = correctCount + (correct ? 1 : 0);
    const nextAccuracy =
      nextAnswered > 0
        ? Math.round((nextCorrect / nextAnswered) * 100)
        : 0;

    setAnsweredCount(nextAnswered);
    setCorrectCount(nextCorrect);

    if (domain && code) {
      void saveProgressToServer(domain, code, nextAccuracy, nextAnswered, nextCorrect, false);
    }
  }

  async function handleFinishSubdomain() {
    if (!domain || !code || !user) return;
    const letter = domain as DomainLetter;

    setLocalProgress(letter, code, accuracyPercent);

    await saveProgressToServer(
      letter,
      code,
      accuracyPercent,
      answeredCount,
      correctCount,
      true
    );

    setShowSummary(true);
  }

  function handleNextQuestion() {
    if (!isAnswered) return;

    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setIsAnswered(false);
      setIsCorrect(null);
    } else {
      void handleFinishSubdomain();
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
      router.push("/quiz");
      return;
    }
    router.push({
      pathname: "/quiz/runner",
      query: { code: nextCode },
    });
  }

  function renderRationales() {
    if (!current || !isAnswered || !selected) return null;
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
      </div>
    );
  }

  if (!domain || !code) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold">Quiz</h1>
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

  if (user === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-gray-600">Checking your session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold">Quiz</h1>
        <p className="mb-3 text-sm text-gray-700">
          You must be signed in to take quizzes and track your progress.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/login")}
            className="rounded-md border bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign in
          </button>
          <button
            onClick={handleBackToToc}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Back to Quiz home
          </button>
        </div>
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
        <h1 className="mb-2 text-2xl font-semibold">Quiz</h1>
        <p className="mb-3 text-sm text-red-600">
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
        <h1 className="mb-2 text-2xl font-semibold">Quiz</h1>
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
  const imageUrl = buildImageUrl(current.image_path);

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-8">
      {showSummary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-1 text-xl font-semibold">
              Subdomain complete – {code}
            </h2>
            <p className="mb-3 text-sm text-gray-600">
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
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handleBackToToc}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Back to TOC
              </button>
              <button
                onClick={handleNextSubdomain}
                className="rounded-md border bgBlack px-3 py-1.5 text-sm font-semibold text-white bg-black"
              >
                Next subdomain
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-6">
        <button
          onClick={handleBackToToc}
          className="mb-2 text-sm text-blue-700 underline-offset-2 hover:underline"
        >
          ← Back to TOC
        </button>

        <h1 className="mb-1 text-3xl font-semibold">Quiz</h1>
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
              width: `${
                totalQuestions ? (answeredCount / totalQuestions) * 100 : 0
              }%`,
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {/* Optional image */}
        {imageUrl && (
          <div className="mb-4 flex justify-center">
            <img
              src={imageUrl}
              alt="Quiz question illustration"
              className="max-h-64 w-full max-w-xl rounded-md border object-contain"
            />
          </div>
        )}

        <p className="mb-4 whitespace-pre-line text-base font-medium text-gray-900">
          {current.question}
        </p>

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

        {renderRationales()}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleNextQuestion}
            disabled={!isAnswered}
            className="rounded-md border bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {currentIdx + 1 < totalQuestions
              ? "Next question"
              : "Finish subdomain"}
          </button>
        </div>
      </section>
    </main>
  );
}
