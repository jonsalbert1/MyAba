import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function QuizReview() {
  const router = useRouter();
  const code = String(router.query.code || "").toUpperCase();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/quiz/review?code=${code}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error || "Failed to load review");
        setItems(j.data);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [code]);

  if (!code) return <main className="max-w-3xl mx-auto p-6">Invalid code</main>;
  if (loading) return <main className="max-w-3xl mx-auto p-6">Loading review…</main>;

  const incorrectItems = items.filter((i) => !i.is_correct);
  const displayedItems = showIncorrectOnly ? incorrectItems : items;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <Link
            href={`/quiz/${code}`}
            className="text-brandblue hover:text-brandblue/80 text-sm"
          >
            ← Back to Quiz
          </Link>
          <h1 className="text-2xl font-semibold text-brandblue mt-1">
            Review: {code} ({items.length} answered)
          </h1>
        </div>

        {incorrectItems.length > 0 && (
          <button
            onClick={() => setShowIncorrectOnly((v) => !v)}
            className="px-4 py-2 rounded bg-brandblue text-white hover:bg-brandblue/90 text-sm"
          >
            {showIncorrectOnly
              ? `Show All (${items.length})`
              : `Retry Incorrect (${incorrectItems.length})`}
          </button>
        )}
      </header>

      {displayedItems.length === 0 && (
        <p className="text-gray-600">
          {showIncorrectOnly
            ? "No incorrect answers to review 🎉"
            : "You haven't answered any questions yet."}
        </p>
      )}

      {displayedItems.length > 0 && (
        <ol className="space-y-5">
          {displayedItems.map((item) => {
            const q = item.quiz_questions;
            const userChoice = item.choice;
            const correct = q.correct_answer;
            const isCorrect = item.is_correct;

            return (
              <li key={item.question_id} className="border rounded-lg p-4 space-y-2">
                <div className="font-medium">
                  {q.ordinal}. {q.question}
                </div>
                <div className="space-y-1">
                  {["a", "b", "c", "d"].map((opt) => {
                    const val = q[opt];
                    const isUser = userChoice === opt;
                    const isCorrectAnswer = correct === opt;
                    return (
                      <div
                        key={opt}
                        className={`p-2 rounded ${
                          isCorrectAnswer
                            ? "bg-green-100 border border-green-400"
                            : isUser && !isCorrectAnswer
                            ? "bg-red-100 border border-red-400"
                            : "bg-gray-50 border"
                        }`}
                      >
                        <strong>{opt.toUpperCase()}.</strong> {val}
                        {isUser && (
                          <span className="ml-2 text-sm italic text-gray-600">
                            {isCorrect ? "✅ Your answer" : "❌ Your answer"}
                          </span>
                        )}
                        {isCorrectAnswer && (
                          <span className="ml-2 text-sm italic text-green-700">
                            ✔ Correct answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <strong>Rationale:</strong> {q.rationale_correct}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
