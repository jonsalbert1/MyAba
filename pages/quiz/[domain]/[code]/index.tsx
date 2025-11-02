// pages/quiz/[domain]/[code]/index.tsx
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Q = {
  id: string | number;
  question: string;
  a: string; b: string; c: string; d: string;
  correct_answer: "A" | "B" | "C" | "D";
  // optional fields
  statement?: string | null;
  subdomain_text?: string | null;
  // tolerate extra columns we may fetch
  subdomain?: string | null;
  domain?: string | null;
  published?: boolean | null;
};

export default function QuizSubdomainPage() {
  const router = useRouter();
  const { isReady, query, asPath } = router;

  // Normalize params
  const domain = useMemo(
    () => (isReady ? String(query.domain ?? "").toUpperCase().trim() : ""),
    [isReady, query.domain]
  );
  const rawCode = useMemo(
    () => (isReady ? String(query.code ?? "").toUpperCase().trim() : ""),
    [isReady, query.code]
  );
  // Allow /quiz/A/1 and /quiz/A/A1 → "A1"
  const code = useMemo(() => {
    if (!domain || !rawCode) return "";
    return rawCode.startsWith(domain) ? rawCode : `${domain}${rawCode}`;
  }, [domain, rawCode]);

  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<Q[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Q["correct_answer"] | null>>({});
  const [finished, setFinished] = useState(false);

  const currentAnswer = answers[idx] ?? null;
  const correctCount = useMemo(
    () => qs.reduce((n, q, i) => n + ((answers[i] ?? "") === q.correct_answer ? 1 : 0), 0),
    [qs, answers]
  );

  // ---- Robust loader: tries several shapes (subdomain, subdomain_code, domain+numeric, etc.)
  useEffect(() => {
    if (!isReady || !code || !domain) return;

    (async () => {
      setLoading(true);
      setErr(null);
      setIdx(0);
      setAnswers({});
      setFinished(false);

      try {
        const selectCols =
          "id, question, a, b, c, d, correct_answer, statement, subdomain_text, subdomain, domain, published";

        const codeUpper = code.toUpperCase();
        const numeric = codeUpper.replace(/^[A-I]/i, ""); // "A1" -> "1"
        const attempts: { name: string; count: number; error?: string }[] = [];

        async function run(q: ReturnType<typeof supabase.from>) {
          const { data, error } = await q.select(selectCols).limit(10);
          return { data: (data ?? []) as Q[], error };
        }

        let found: Q[] = [];

        // A) subdomain == "A1" (+ published true OR null so drafts show while debugging)
        {
          const { data, error } = await run(
            supabase
              .from("quiz_questions")
              .eq("subdomain", codeUpper)
              .or("published.is.true,published.is.null")
              .order("id", { ascending: true })
          );
          attempts.push({ name: "A: subdomain == A1", count: data.length, error: error?.message });
          if (data.length) found = data;
        }

        // B) subdomain ILIKE "A1" (legacy casing)
        if (!found.length) {
          const { data, error } = await run(
            supabase
              .from("quiz_questions")
              .ilike("subdomain", codeUpper)
              .or("published.is.true,published.is.null")
              .order("id", { ascending: true })
          );
          attempts.push({ name: "B: subdomain ILIKE A1", count: data.length, error: error?.message });
          if (data.length) found = data;
        }

        // C) domain == "A" AND subdomain_code == "1"
        if (!found.length) {
          const { data, error } = await run(
            supabase
              .from("quiz_questions")
              .eq("domain", domain.toUpperCase())
              .eq("subdomain_code", numeric)     // tolerate schema with subdomain_code
              .or("published.is.true,published.is.null")
              .order("id", { ascending: true })
          );
          attempts.push({ name: "C: domain == A AND subdomain_code == 1", count: data.length, error: error?.message });
          if (data.length) found = data;
        }

        // D) domain == "A" AND subdomain == "1" (older imports with numeric-only subdomain)
        if (!found.length) {
          const { data, error } = await run(
            supabase
              .from("quiz_questions")
              .eq("domain", domain.toUpperCase())
              .eq("subdomain", numeric)
              .or("published.is.true,published.is.null")
              .order("id", { ascending: true })
          );
          attempts.push({ name: "D: domain == A AND subdomain == 1", count: data.length, error: error?.message });
          if (data.length) found = data;
        }

        // E) loose fallback: subdomain ILIKE "A%" (lets you at least see something for debugging)
        if (!found.length) {
          const { data, error } = await run(
            supabase
              .from("quiz_questions")
              .ilike("subdomain", `${domain.toUpperCase()}%`)
              .or("published.is.true,published.is.null")
              .order("id", { ascending: true })
          );
          attempts.push({ name: "E: loose subdomain ILIKE A%", count: data.length, error: error?.message });
          if (data.length) found = data;
        }

        console.log("[QUIZ] attempts:", attempts);
        setQs(found);
      } catch (e: any) {
        console.error("[QUIZ] fetch error:", e);
        setErr(e?.message ?? String(e));
        setQs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isReady, code, domain]);

  // Compute next subdomain: "A1" -> "A2"
  const nextSubdomain = useMemo(() => {
    if (!code) return null;
    const m = code.match(/^([A-I])(\d{1,2})$/i);
    if (!m) return null;
    const letter = m[1].toUpperCase();
    const num = parseInt(m[2], 10);
    if (Number.isNaN(num)) return null;
    return `${letter}${num + 1}`;
  }, [code]);

  function pickAnswer(choice: Q["correct_answer"]) {
    if (finished) return;
    setAnswers(prev => ({ ...prev, [idx]: choice }));
  }
  function next() {
    if (idx < qs.length - 1) setIdx(i => i + 1);
  }
  function prev() {
    if (idx > 0) setIdx(i => i - 1);
  }
  async function finish() {
    setFinished(true);

    // Persist progress (merge-safe on server)
    try {
      const pct = Math.round((correctCount / Math.max(qs.length, 1)) * 100);
      await fetch("/api/progress/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,               // e.g., "A1"
          domain,             // optional hint
          last_index: qs.length,
          best_accuracy: pct,
          done: qs.length >= 10,
        }),
      });
    } catch (e) {
      console.warn("Progress upsert failed:", e);
    }
  }

  if (!isReady) {
    return <main className="mx-auto max-w-3xl px-6 py-10">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* Debug strip */}
      <div className="text-xs mb-3 rounded border p-2 bg-white">
        <div>path=<code>{asPath}</code></div>
        <div>domain=<b>{domain || "—"}</b> · code=<b>{code || "—"}</b> · items=<b>{qs.length}</b></div>
        {err && <div className="text-red-600">Error: {err}</div>}
        {qs.length === 0 && !loading && !err && (
          <div className="text-amber-700 mt-1">
            If you expect items here, check: ① RLS select policy on <code>quiz_questions</code>, ② that
            <code> subdomain</code> (or <code>subdomain_code</code>) matches “{code}”, and ③ that <code>published</code> isn’t all FALSE.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/quiz" className="text-blue-700 hover:underline">← Quiz Home</Link>
        <span className="text-gray-400">|</span>
        <Link href={`/course/${domain}`} className="text-blue-700 hover:underline">Back to {domain} TOC</Link>
      </div>

      <h1 className="mt-3 text-2xl font-semibold">Quiz {code}</h1>

      {loading ? (
        <p className="mt-6 text-gray-600">Loading questions…</p>
      ) : qs.length === 0 ? (
        <p className="mt-6 text-gray-600">No questions yet for {code}.</p>
      ) : finished ? (
        <ResultCard
          code={code}
          correct={correctCount}
          total={qs.length}
          nextHref={nextSubdomain ? `/quiz/${domain}/${nextSubdomain}` : null}
        />
      ) : (
        <QuestionCard
          q={qs[idx]}
          idx={idx}
          total={qs.length}
          answer={currentAnswer}
          onPick={pickAnswer}
          onNext={next}
          onPrev={prev}
          onFinish={finish}
          isLast={idx === qs.length - 1}
        />
      )}
    </main>
  );
}

function QuestionCard({
  q, idx, total, answer, onPick, onNext, onPrev, onFinish, isLast,
}: {
  q: Q; idx: number; total: number;
  answer: Q["correct_answer"] | null;
  onPick: (choice: Q["correct_answer"]) => void;
  onNext: () => void; onPrev: () => void; onFinish: () => void;
  isLast: boolean;
}) {
  const choices: Array<["A"|"B"|"C"|"D", string]> = [
    ["A", q.a], ["B", q.b], ["C", q.c], ["D", q.d]
  ];
  const isCorrect = answer ? (answer === q.correct_answer) : null;

  return (
    <div className="mt-6 rounded-xl border bg-white p-5">
      <div className="text-sm text-gray-500">
        Question {idx + 1} of {total}
        {q.subdomain_text ? <span className="ml-2 text-gray-400">— {q.subdomain_text}</span> : null}
      </div>

      <div className="mt-2 text-lg font-medium">
        {q.statement ? (<><span className="text-gray-800">{q.statement} </span></>) : null}
        {q.question}
      </div>

      <div className="mt-4 grid gap-3">
        {choices.map(([key, text]) => {
          const picked = answer === key;
          const pickedClasses = picked
            ? (key === q.correct_answer ? "bg-green-600 text-white" : "bg-red-600 text-white")
            : "bg-gray-100 hover:bg-gray-200";
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className={`rounded-lg px-3 py-2 text-left transition ${pickedClasses}`}
              disabled={answer !== null}
            >
              <span className="font-semibold mr-2">{key}.</span>{text}
            </button>
          );
        })}
      </div>

      {answer && (
        <div className="mt-4">
          {isCorrect ? (
            <div className="rounded-md bg-green-100 text-green-800 px-3 py-2">Correct</div>
          ) : (
            <div className="rounded-md bg-red-100 text-red-800 px-3 py-2">
              Not quite. Correct answer is <strong>{q.correct_answer}</strong>.
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-between">
        <button onClick={onPrev} className="rounded-md border px-3 py-2 hover:bg-gray-100" disabled={idx === 0}>
          Prev
        </button>
        {isLast ? (
          <button onClick={onFinish} className="rounded-md border px-3 py-2 hover:bg-gray-100">
            Finish
          </button>
        ) : (
          <button onClick={onNext} className="rounded-md border px-3 py-2 hover:bg-gray-100">
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  code, correct, total, nextHref,
}: {
  code: string; correct: number; total: number; nextHref: string | null;
}) {
  const pct = Math.round((correct / Math.max(total, 1)) * 100);
  return (
    <div className="mt-6 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold mb-2">Results — {code}</h2>
      <p className="mb-4">
        Score: <strong>{correct}</strong> / {total} ({pct}%)
      </p>
      <div className="flex gap-3">
        <Link href="/quiz" className="rounded-md border px-3 py-2 hover:bg-gray-100">
          Back to Quiz Home
        </Link>
        {nextHref && (
          <Link href={nextHref} className="rounded-md border px-3 py-2 hover:bg-gray-100">
            Next Subdomain →
          </Link>
        )}
      </div>
    </div>
  );
}
