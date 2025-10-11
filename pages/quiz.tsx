// pages/quiz.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type Q = {
  id?: number;
  question: string;
  a: string; b: string; c: string; d: string;
  answer: "a" | "b" | "c" | "d";
  rationale?: string;
};

export default function QuizPage() {
  const [items, setItems] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<null | "a" | "b" | "c" | "d">(null);

  useEffect(() => {
    // TODO: swap to your API when ready; placeholder data for styling
    setItems([
      { question: "What does SD stand for?", a: "Stimulus Delta", b: "Stimulus Discriminator", c: "Discriminative Stimulus", d: "Differential Stimulus", answer: "c", rationale: "SD signals availability of reinforcement for a response." },
      { question: "MO stands for…", a: "Motivating Operation", b: "Maintenance Objective", c: "Mastery Outcome", d: "Multiple Operant", answer: "a", rationale: "MOs alter the value of a reinforcer and the current frequency of behavior." },
    ]);
  }, []);

  const q = items[i];
  const isCorrect = useMemo(() => chosen && q && chosen === q.answer, [chosen, q]);

  const choose = (opt: "a" | "b" | "c" | "d") => setChosen(opt);
  const next = () => { setChosen(null); setI(x => (items.length ? (x + 1) % items.length : 0)); };

  const btnClass = (opt: "a" | "b" | "c" | "d") => {
    if (!chosen) return "bg-white border hover:border-blue-300";
    if (opt === q.answer) return "bg-green-100 border-green-500";
    if (opt === chosen) return "bg-red-100 border-red-500";
    return "bg-white border";
  };

  return (
    <>
      <Head><title>myABA | Quiz</title></Head>
      <main className="min-h-screen px-6 py-8">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-4">Quiz</h1>

        {!q ? (
          <p className="text-gray-600">Loading questions…</p>
        ) : (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="text-sm text-gray-500 mb-2">
                Question {i + 1} / {items.length}
              </div>
              <div className="text-xl font-semibold mb-4">{q.question}</div>

              <div className="grid gap-3">
                {(["a", "b", "c", "d"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => choose(opt)}
                    disabled={!!chosen}
                    className={`text-left rounded-xl px-4 py-3 border transition ${btnClass(opt)}`}
                  >
                    <span className="font-semibold mr-2">{opt.toUpperCase()}.</span>
                    {q[opt]}
                  </button>
                ))}
              </div>

              {chosen && (
                <div className={`mt-4 rounded-xl p-4 ${isCorrect ? "bg-green-50 border border-green-400" : "bg-red-50 border border-red-400"}`}>
                  <div className="font-bold mb-1">
                    {isCorrect ? "✅ Correct" : "❌ Incorrect"}
                  </div>
                  {q.rationale && <div className="text-sm text-gray-700">{q.rationale}</div>}
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={next}
                  className="bg-blue-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
