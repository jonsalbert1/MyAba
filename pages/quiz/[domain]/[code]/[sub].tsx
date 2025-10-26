import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Q = {
  id: string | number;
  question: string;
  a: string; b: string; c: string; d: string;
  correct_answer: "A" | "B" | "C" | "D";
};

export default function QuizRunner() {
  const router = useRouter();
  const { isReady, query } = router;
  const domain = isReady ? String(query.domain ?? "").toUpperCase() : "";
  const code   = isReady ? String(query.code ?? "") : "";

  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !code) return;
    (async () => {
      setLoading(true);
      // Pull questions for this subdomain (e.g., "A1")
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question, a, b, c, d, correct_answer")
        .eq("subdomain", code)
        .order("id", { ascending: true });

      if (error) {
        console.error("Load questions error:", error);
        setQs([]);
      } else {
        setQs((data ?? []) as Q[]);
      }
      setIdx(0);
      setAnswer(null);
      setLoading(false);
    })();
  }, [isReady, code]);

  if (!isReady) {
    return <main className="mx-auto max-w-3xl px-6 py-10">Loading…</main>;
  }

  if (!domain || !code) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-gray-600">Unknown quiz.</p>
        <Link href="/course" className="text-blue-700 underline">← Back to Course</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/course/${domain}`} className="text-blue-700 hover:underline">← {domain} TOC</Link>
      <h1 className="mt-3 text-2xl font-semibold">Quiz {code}</h1>

      {loading ? (
        <p className="mt-6 text-gray-600">Loading questions…</p>
      ) : qs.length === 0 ? (
        <p className="mt-6 text-gray-600">No questions yet for {code}.</p>
      ) : (
        <QuestionCard
          q={qs[idx]}
          idx={idx}
          total={qs.length}
          answer={answer}
          onPick={(ch) => setAnswer(ch)}
          onNext={() => { setAnswer(null); setIdx(i => Math.min(i + 1, qs.length - 1)); }}
          onPrev={() => { setAnswer(null); setIdx(i => Math.max(i - 1, 0)); }}
        />
      )}
    </main>
  );
}

function QuestionCard({
  q, idx, total, answer, onPick, onNext, onPrev,
}: {
  q: Q; idx: number; total: number;
  answer: string | null;
  onPick: (choice: "A"|"B"|"C"|"D") => void;
  onNext: () => void; onPrev: () => void;
}) {
  const choices: Array<["A"|"B"|"C"|"D", string]> = [
    ["A", q.a], ["B", q.b], ["C", q.c], ["D", q.d]
  ];
  const correct = answer ? (answer === q.correct_answer) : null;

  return (
    <div className="mt-6 rounded-xl border bg-white p-5">
      <div className="text-sm text-gray-500">Question {idx + 1} of {total}</div>
      <div className="mt-2 text-lg font-medium">{q.question}</div>

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
          {correct ? (
            <div className="rounded-md bg-green-100 text-green-800 px-3 py-2">Correct</div>
          ) : (
            <div className="rounded-md bg-red-100 text-red-800 px-3 py-2">
              Not quite. Correct answer is <strong>{q.correct_answer}</strong>.
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-between">
        <button onClick={onPrev} className="rounded-md border px-3 py-2 hover:bg-gray-100">Prev</button>
        <button onClick={onNext} className="rounded-md border px-3 py-2 hover:bg-gray-100">Next</button>
      </div>
    </div>
  );
}
