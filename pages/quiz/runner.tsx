// pages/quiz/runner.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

// Localhost can switch between v1/v2 by setting NEXT_PUBLIC_QUIZ_TABLE in .env.local
const QUIZ_TABLE = "quiz_questions_v2";
type QuizItem = {
  id: string;
  domain?: string | null;
  subdomain?: string | null;
  question?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
  correct_answer?: string | null; // v1 may store "A/B/C/D"; v2 stores full correct option text
  rationale_correct?: string | null;
  // ...rest of your fields
};

type AttemptStatus = "in_progress" | "completed";

type QuizAttempt = {
  id: string;
  user_id: string;
  domain: string;
  subdomain_code: string;
  question_ids: string[];
  current_index: number;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  status: AttemptStatus;
  created_at: string;
  updated_at: string;
};

type AnswerLetter = "A" | "B" | "C" | "D";

const DISPLAY_LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

// Normalize answer text for robust equality checks (ignore case + extra whitespace)
const stripChoicePrefix = (s: string | null | undefined) => {
  const x = String(s ?? "");
  // Remove leading "A. ", "B) ", "C: ", "D - " (common import artifacts)
  return x.replace(/^\s*[A-D]\s*[\.)\:\-]\s*/i, "").trim();
};

const norm = (s: string | null | undefined) => stripChoicePrefix(s)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();


const isAnswerLetter = (x: string | null | undefined): x is AnswerLetter =>
  x === "A" || x === "B" || x === "C" || x === "D";

const getBaseOptionText = (item: QuizItem, letter: AnswerLetter | null) => {
  if (!letter) return null;
  return letter === "A"
    ? item.a ?? null
    : letter === "B"
    ? item.b ?? null
    : letter === "C"
    ? item.c ?? null
    : item.d ?? null;
};

// Small deterministic hash (FNV-1a) used for stable, repeatable rotations.
const hash32 = (input: string) => {
  let h = 0x811c9dc5; // 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // 16777619
  }
  return h >>> 0;
};

const shuffledIndices = (n: number, seed: number) => {
  const arr = Array.from({ length: n }, (_, i) => i);
  let x = seed || 1;
  const next = () => {
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };

  for (let i = n - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Build the answer choices in a stable shuffled order.
// This lets us "rotate answers" for presentation WITHOUT breaking correctness,
// because we always grade by the selected answer TEXT.
const getDisplayedOptions = (item: QuizItem, keySeed: string) => {
  const base = [
    { baseLetter: "A" as const, text: stripChoicePrefix(item.a) },
    { baseLetter: "B" as const, text: stripChoicePrefix(item.b) },
    { baseLetter: "C" as const, text: stripChoicePrefix(item.c) },
    { baseLetter: "D" as const, text: stripChoicePrefix(item.d) },
  ];

  const seed = hash32(`${keySeed}:${item.id ?? item.question ?? ""}`);
  const order = shuffledIndices(base.length, seed);

  return order.map((baseIdx, displayIdx) => ({
    displayLetter: DISPLAY_LETTERS[displayIdx],
    baseLetter: base[baseIdx].baseLetter,
    text: base[baseIdx].text,
  }));
};

const getDisplayedText = (
  item: QuizItem,
  displayLetter: AnswerLetter | null,
  keySeed: string
) => {
  if (!displayLetter) return null;
  const opts = getDisplayedOptions(item, keySeed);
  return opts.find((o) => o.displayLetter === displayLetter)?.text ?? null;
};

// Single source of truth for correctness:
// - v2: correct_answer is already the correct option text
// - v1: correct_answer may be a letter; convert it to the matching option text
const getCorrectText = (item: QuizItem) => {
  const ca = item.correct_answer ?? null;
  if (!ca) return null;
  if (isAnswerLetter(ca)) return getBaseOptionText(item, ca);
  return stripChoicePrefix(ca);
};

// Derive correct DISPLAY letter (A/B/C/D as shown to the learner) for UI only.
// Never use this for grading truth.
const getCorrectDisplayLetter = (
  item: QuizItem,
  keySeed: string,
  correctText: string | null
): AnswerLetter | null => {
  if (!correctText) return null;
  const opts = getDisplayedOptions(item, keySeed);
  const ct = norm(correctText);
  for (const o of opts) {
    if (norm(o.text) === ct) return o.displayLetter;
  }
  return null;
};
function normalizeArrayIds(arr: any[] | null | undefined): string[] {
  if (!arr) return [];
  return arr.map((x) => String(x));
}

// Normalize codes like "A1" -> "A01", "B9" -> "B09"
function normalizeSubCode(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/^([A-Ia-i])(\d{1,2})$/);
  if (!m) return raw;
  const letter = m[1].toUpperCase();
  const num = m[2].padStart(2, "0");
  return `${letter}${num}`;
}

// DOMAIN COUNTS — needed for "Next: A02" logic
const DOMAIN_COUNTS: Record<string, number> = {
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

// Compute next subdomain code
function getNextSubdomain(code: string): string | null {
  if (!code) return null;
  const domainLetter = code[0];
  const num = parseInt(code.slice(1), 10);
  if (isNaN(num)) return null;

  const max = DOMAIN_COUNTS[domainLetter];
  if (!max) return null;

  const next = num + 1;
  if (next > max) return null;

  return `${domainLetter}${String(next).padStart(2, "0")}`;
}

export default function QuizRunnerPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const rawCode =
    (router.query.code as string | undefined) ??
    (router.query.subdomain as string | undefined) ??
    "";

  const normalizedCode = normalizeSubCode(rawCode);

  const rawDomain = (router.query.domain as string | undefined) ?? "";
  const domain = rawDomain || (normalizedCode ? normalizedCode[0] : "");
  const subCode = normalizedCode;

  const resumeFlag = router.query.resume === "1";
  const freshFlag = router.query.fresh === "1";

  const QUIZ_SIZE = 10;
  const BANK_LIMIT = 50;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [index, setIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentItem = items[index] ?? null;

  const domainTitle = domain ? getDomainTitle(domain) : "";
  const subdomainText = subCode ? getSubdomainText(subCode) : "";

  // localStorage keys
  const doneKey = `quiz:done:${domain}:${subCode}`;
  const accKey = `quiz:accuracy:${domain}:${subCode}`;
  const liveKey = `quiz:live:${domain}:${subCode}`;

  function setLocalLive(answeredCount: number, total: number) {
    if (typeof window === "undefined") return;
    try {
      const payload = { answeredCount, total, lastUpdated: Date.now() };
      window.localStorage.setItem(liveKey, JSON.stringify(payload));
      window.localStorage.removeItem(doneKey);
    } catch {}
  }

  function setLocalDone(correctCount: number, total: number) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(doneKey, "1");
      window.localStorage.removeItem(liveKey);
      if (total > 0) {
        const pct = Math.round((correctCount / total) * 100);
        window.localStorage.setItem(accKey, String(pct));
      }
    } catch {}
  }

  // ============================
  // LOAD or RESUME ATTEMPT
  // ============================
  useEffect(() => {
    if (!router.isReady) return;
    if (!user) {
      setMsg("You must be logged in to run this quiz.");
      setLoading(false);
      return;
    }
    if (!subCode) {
      setMsg("Missing subdomain code in URL.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setMsg("Loading quiz…");
      try {
        // Resume existing attempt?
        if (!freshFlag) {
          const { data: attempts } = await supabase
            .from("quiz_attempts")
            .select("*")
            .eq("user_id", user.id)
            .eq("domain", domain)
            .eq("subdomain_code", subCode)
            .eq("status", "in_progress")
            .order("updated_at", { ascending: false })
            .limit(1);

          const existing = attempts?.[0];
          if (existing && (resumeFlag || !freshFlag)) {
            const attemptRow: QuizAttempt = {
              ...existing,
              question_ids: normalizeArrayIds(existing.question_ids),
            };

            const { data: questions, error: qErr } = await supabase
              .from(QUIZ_TABLE)
              .select("*")
              .in("id", attemptRow.question_ids);

            if (qErr) {
              setMsg(qErr.message ?? "Error loading questions.");
              setLoading(false);
              return;
            }

            const map = new Map<string, QuizItem>();
            (questions ?? []).forEach((q: any) =>
              map.set(String(q.id), {
                id: String(q.id),
                domain: q.domain,
                subdomain: q.subdomain,
                question: q.question,
                a: q.a,
                b: q.b,
                c: q.c,
                d: q.d,
                correct_answer: q.correct_answer,
                rationale_correct: q.rationale_correct,
              })
            );

            const ordered = attemptRow.question_ids
              .map((id) => map.get(id))
              .filter((x): x is QuizItem => !!x);

            setAttempt(attemptRow);
            setItems(ordered);
            setIndex(
              attemptRow.current_index >= 0 &&
                attemptRow.current_index < ordered.length
                ? attemptRow.current_index
                : 0
            );
            setLocalLive(attemptRow.current_index, ordered.length);
            setMsg(null);
            setLoading(false);
            return;
          }
        }

        // Fresh quiz
        const { data: questions, error: qErr } = await supabase
          .from(QUIZ_TABLE)
          .select("*")
          .eq("domain", domain)
          .eq("subdomain", subCode)
          .eq("is_active", true)
          .limit(BANK_LIMIT);

        if (qErr) {
          setMsg(qErr.message ?? "Error loading questions.");
          setLoading(false);
          return;
        }

        if (!questions || questions.length === 0) {
          setMsg("No questions found for this subdomain.");
          setLoading(false);
          return;
        }

// Rotate WHICH questions (and their order) per attempt, per subdomain.
// We sample QUIZ_SIZE questions from a larger BANK_LIMIT bank.
const bank = questions ?? [];
const attemptSeed = hash32(`${user?.id ?? "anon"}:${subCode}:${Date.now()}`);
const qOrder = shuffledIndices(bank.length, attemptSeed);
const selectedQuestions = qOrder
  .map((i) => bank[i])
  .slice(0, Math.min(QUIZ_SIZE, bank.length));

const quizItems: QuizItem[] = selectedQuestions.map((q: any) => ({

          id: String(q.id),
          domain: q.domain,
          subdomain: q.subdomain,
          question: q.question,
          a: q.a,
          b: q.b,
          c: q.c,
          d: q.d,
          correct_answer: q.correct_answer,
          rationale_correct: q.rationale_correct,
        }));

        const questionIds = quizItems.map((q) => q.id);

        const { data: inserted, error: insErr } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            domain,
            subdomain_code: subCode,
            question_ids: questionIds,
            current_index: 0,
            total_questions: quizItems.length,
            correct_count: 0,
            incorrect_count: 0,
            status: "in_progress",
          })
          .select("*")
          .single();

        if (insErr) {
          setMsg(insErr.message ?? "Error starting quiz.");
          setLoading(false);
          return;
        }

        const attemptRow: QuizAttempt = {
          ...inserted,
          question_ids: normalizeArrayIds(inserted.question_ids),
        };

        setAttempt(attemptRow);
        setItems(quizItems);
        setIndex(0);
        setLocalLive(0, quizItems.length);
        setMsg(null);
        setLoading(false);
      } catch (e: any) {
        setMsg(e?.message ?? "Unexpected error");
        setLoading(false);
      }
    };

    load();
  }, [router.isReady, user, domain, subCode, resumeFlag, freshFlag, supabase]);

  // ============================
  // HANDLE ANSWER
  // ============================

  const isCorrect = useMemo(() => {
    if (!currentItem || !selectedAnswer) return null;

    const correctText = getCorrectText(currentItem);
    if (!correctText) return null;

    // selectedAnswer stores the displayed option TEXT (not a letter)
    return norm(selectedAnswer) === norm(correctText);
  }, [currentItem, selectedAnswer]);

  // 🎯 optimistic grading + save
  const handleSelect = (choiceText: string) => {
    if (!choiceText) return;
    if (showFeedback || submitting) return;
    setSelectedAnswer(choiceText);

    if (!attempt || !currentItem) return;

    // 1️⃣ Compute new scores locally
    // We store the *option text* as the user's selectedAnswer.
    // correct_answer in v2 is also stored as the *option text*.
    const correctText = getCorrectText(currentItem);
    const correct = !!correctText && norm(choiceText) === norm(correctText);

    const newCorrect = attempt.correct_count + (correct ? 1 : 0);
    const newIncorrect = attempt.incorrect_count + (correct ? 0 : 1);

    const nextIndex = index + 1;
    const isLast = nextIndex >= items.length;
    const newStatus: AttemptStatus = isLast ? "completed" : "in_progress";

    const totalQ = items.length;
    const nowIso = new Date().toISOString();

    // 2️⃣ Update localStorage immediately
    if (newStatus === "completed") {
      setLocalDone(newCorrect, totalQ);
    } else {
      setLocalLive(index + 1, totalQ);
    }

    // 3️⃣ Update local attempt state immediately
    setAttempt((prev) =>
      prev
        ? {
            ...prev,
            correct_count: newCorrect,
            incorrect_count: newIncorrect,
            current_index: isLast ? index : nextIndex,
            status: newStatus,
            updated_at: nowIso,
          }
        : prev
    );

    // 4️⃣ Show feedback right away
    setShowFeedback(true);

    // 5️⃣ Save to Supabase in background
    setSubmitting(true);
    (async () => {
      try {
        // Update quiz_attempts row
        const { error: updErr } = await supabase
          .from("quiz_attempts")
          .update({
            correct_count: newCorrect,
            incorrect_count: newIncorrect,
            current_index: isLast ? index : nextIndex,
            status: newStatus,
            updated_at: nowIso,
          })
          .eq("id", attempt.id);

        if (updErr) {
          console.warn("quiz_attempts update error:", updErr);
        }

        // If quiz is finished, upsert into quiz_subdomain_progress
        if (newStatus === "completed" && user && totalQ > 0) {
          const pct = Math.round((newCorrect / totalQ) * 100);

          // See if we already have a row for this user+domain+subdomain
          const { data: existing, error: selErr } = await supabase
            .from("quiz_subdomain_progress")
            .select("best_accuracy_percent")
            .eq("user_id", user.id)
            .eq("domain", domain)
            .eq("subdomain", subCode)
            .maybeSingle();

          if (selErr) {
            console.warn("quiz_subdomain_progress select error:", selErr);
          } else if (!existing) {
            // No previous record → insert
            const { error: insErr2 } = await supabase
              .from("quiz_subdomain_progress")
              .insert({
                user_id: user.id,
                domain,
                subdomain: subCode,
                best_accuracy_percent: pct,
              });

            if (insErr2) {
              console.warn("quiz_subdomain_progress insert error:", insErr2);
            }
          } else if (
            existing.best_accuracy_percent == null ||
            pct > existing.best_accuracy_percent
          ) {
            // Better score → update
            const { error: upd2Err } = await supabase
              .from("quiz_subdomain_progress")
              .update({ best_accuracy_percent: pct })
              .eq("user_id", user.id)
              .eq("domain", domain)
              .eq("subdomain", subCode);

            if (upd2Err) {
              console.warn("quiz_subdomain_progress update error:", upd2Err);
            }
          }
        }
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleNext = () => {
    if (!items.length) return;

    const nextIndex = index + 1;
    if (nextIndex < items.length) {
      setIndex(nextIndex);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setShowFeedback(false);
    }
  };

  // ============================
  // UI HELPERS
  // ============================

  const progressLabel = useMemo(() => {
    if (!items.length) return "0 / 0";
    return `${index + 1} / ${items.length}`;
  }, [index, items.length]);

  const renderChoices = () => {
    if (!currentItem) return null;

    const options = [
      { key: "A" as const, label: currentItem.a },
      { key: "B" as const, label: currentItem.b },
      { key: "C" as const, label: currentItem.c },
      { key: "D" as const, label: currentItem.d },
    ].filter((opt) => opt.label);

    return (
      <div className="space-y-2 mt-4">
        {options.map((opt) => {
          const isSelected = selectedAnswer === (opt.label ?? null);
          let highlightClasses = "";

          if (showFeedback) {
            const correctText = getCorrectText(currentItem);
            const isCorrectAnswer = !!correctText && (opt.label ?? null) === correctText;

            if (isCorrectAnswer)
              highlightClasses = "border-green-500 bg-green-50";
            else if (isSelected)
              highlightClasses = "border-red-500 bg-red-50";
          } else if (isSelected) {
            highlightClasses = "border-blue-500 bg-blue-50";
          }

          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.label ?? "")}
              disabled={showFeedback || submitting}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                highlightClasses || "border-zinc-300 bg-white"
              } disabled:cursor-default`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderFeedback = () => {
    if (!showFeedback || !currentItem || isCorrect === null) return null;

    const correctText = getCorrectText(currentItem);
    const correctLetter = getCorrectDisplayLetter(currentItem, subCode, correctText);

    return (
      <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
        <div className={isCorrect ? "text-green-700" : "text-red-700"}>
          {isCorrect ? "Correct! 🎉" : "Incorrect."}
        </div>

        {correctText && (
          <div className="mt-1 text-zinc-800">
            Correct answer:{" "}
            <span className="font-semibold">{correctText}</span>
          </div>
        )}

        {currentItem.rationale_correct && (
          <div className="mt-2 text-xs text-zinc-700 whitespace-pre-line">
            <span className="font-semibold">Rationale: </span>
            {currentItem.rationale_correct}
          </div>
        )}
      </div>
    );
  };

  // ============================
  // MAIN RENDER
  // ============================

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold mb-2">Quiz</h1>
        <p className="text-sm text-zinc-600">Please sign in to run quizzes.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Quiz – {domainTitle || domain} {subCode && `• ${subCode}`}
          </h1>

          {subdomainText && <p className="text-xs text-zinc-500 mt-1">{subdomainText}</p>}

          <div className="mt-1 text-xs text-zinc-500">
            Question {progressLabel}{" "}
            {attempt && (
              <>
                • Correct: {attempt.correct_count} • Incorrect: {attempt.incorrect_count} • Status:{" "}
                {attempt.status}
              </>
            )}
          </div>
        </div>

        {/* Back to TOC */}
        <button
          type="button"
          onClick={() => router.push("/quiz")}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
        >
          ← Back to TOC
        </button>
      </header>

      {loading && <p className="text-sm text-zinc-600">{msg || "Loading quiz…"}</p>}

      {!loading && msg && <p className="text-sm text-red-600">{msg}</p>}

      {!loading && !msg && !currentItem && <p className="text-sm text-zinc-600">No question loaded.</p>}

      {!loading && currentItem && (
        <section>
          <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-zinc-900">{currentItem.question}</p>

            {renderChoices()}
          </div>

          {/* === BUTTONS (updated) === */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {items.length > 0 && (
              <>
                {index + 1 < items.length ? (
                  // Not last question: show "Next question"
                  <button
                    onClick={handleNext}
                    disabled={!showFeedback}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Next question
                  </button>
                ) : (
                  // Last question: only show Finish / Next / TOC
                  // AFTER the user has answered (feedback is visible)
                  showFeedback && (
                    <>
                      {/* Finish → Domain TOC */}
                      <button
                        onClick={() => router.push(`/quiz/${domain}`)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                      >
                        Finish
                      </button>

                      {/* Next Subdomain */}
                      {getNextSubdomain(subCode) && (
                        <button
                          onClick={() => router.push(`/quiz/runner?code=${getNextSubdomain(subCode)!}`)}
                          className="rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Next: {getNextSubdomain(subCode)}
                        </button>
                      )}

                      {/* Full TOC */}
                      <button
                        onClick={() => router.push("/quiz")}
                        className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
                      >
                        Full TOC
                      </button>
                    </>
                  )
                )}
              </>
            )}

            {submitting && <span className="text-xs text-zinc-500">Saving…</span>}
          </div>

          {renderFeedback()}
        </section>
      )}
    </main>
  );
}
