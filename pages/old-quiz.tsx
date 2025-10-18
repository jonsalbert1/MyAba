// pages/quiz.tsx
import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

/** ---------- Types ---------- */
type QuizItem = {
  id: string;
  stem: string; // API fallback (question || statement || ...)
  statement: string | null;
  question: string | null;
  choices: { A: string | null; B: string | null; C: string | null; D: string | null };
  correct_key: "A" | "B" | "C" | "D";
  rationale_correct: string | null;
  rationale_distractors: { A: string | null; B: string | null; C: string | null; D: string | null };
};

type QuizResponseOk = {
  ok: true;
  table?: string;
  usedColumn?: string;
  loadInfo?: string;
  items: QuizItem[];
};

type QuizResponseErr = { ok: false; error: string };

type QuizResponse = QuizResponseOk | QuizResponseErr;

/** ---------- Helpers ---------- */
const pretty = (s?: string | null) => (s ?? "").trim();

/**
 * Derive scenario (statement) and prompt (question line) robustly:
 * - Use explicit statement if present.
 * - Else, if stem exists and differs from question, treat stem as Scenario.
 * - Prompt prefers question; else stem; else statement.
 */
function deriveTexts(item: QuizItem) {
  const rawStem = pretty(item.stem);
  const explicitStatement = pretty(item.statement);
  const question = pretty(item.question);

  const statement =
    explicitStatement ||
    (rawStem && rawStem !== question ? rawStem : "");

  const prompt = question || rawStem || explicitStatement || "";

  return { statement, prompt, question };
}

/** ---------- Component ---------- */
const QuizPage: NextPage = () => {
  const router = useRouter();

  // UI inputs (default A1 / 10; updated from query when router is ready)
  const [code, setCode] = useState<string>("A1");
  const [limit, setLimit] = useState<number>(10);

  // data state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<QuizItem[]>([]);

  // per-item selections / reveal
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | undefined>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Read query once router is ready (keeps SSR happy)
  useEffect(() => {
    if (!router.isReady) return;
    const qCode = String(router.query.code || "A1").toUpperCase();
    const qLimit = Number(router.query.limit || 10);
    setCode(qCode);
    setLimit(qLimit);
  }, [router.isReady, router.query.code, router.query.limit]);

  // Load data when code/limit change (after initial query sync)
  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const resp = await fetch(`/api/quiz?code=${encodeURIComponent(code)}&limit=${limit}`);
        const data: QuizResponse = await resp.json();
        if (!resp.ok || !data.ok) {
          setItems([]);
          setErrorMsg(!data.ok ? data.error : `HTTP ${resp.status}`);
        } else {
          if (!active) return;
          setItems(data.items || []);
          setAnswers({});
          setRevealed({});
        }
      } catch (e: any) {
        if (!active) return;
        setItems([]);
        setErrorMsg(e?.message || "Failed to load quiz.");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [code, limit]);

  // Score
  const score = useMemo(() => {
    const total = items.length;
    const correct = items.reduce((acc, it) => (answers[it.id] === it.correct_key ? acc + 1 : acc), 0);
    return { correct, total };
  }, [answers, items]);

  // Apply inputs -> update URL (shallow) and reload
  const onApply = () => {
    const params = new URLSearchParams({ code, limit: String(limit) });
    router.replace(`/quiz?${params.toString()}`, undefined, { shallow: true });
    // effect will run due to state already set
  };

  return (
    <>
      <Head>
        <title>Quiz — {code}</title>
      </Head>

      {/* Top Bar */}
      <div className="w-full border-b bg-white sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">Code:</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-24 rounded-lg border px-2 py-1"
              placeholder="A1"
            />
            <span className="font-medium ml-3">Limit:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => {
                const v = Number(e.target.value || 1);
                setLimit(Math.max(1, Math.min(50, v)));
              }}
              className="w-20 rounded-lg border px-2 py-1"
              placeholder="10"
            />
            <button
              onClick={onApply}
              className="ml-3 rounded-xl bg-black px-4 py-1.5 text-white hover:opacity-90 transition disabled:opacity-40"
              disabled={loading}
            >
              Load
            </button>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">Score:</span> {score.correct} / {score.total}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* States */}
        {loading && (
          <div className="rounded-2xl border p-6 shadow-sm">
            <p className="animate-pulse text-gray-500">Loading questions…</p>
          </div>
        )}
        {!loading && errorMsg && (
          <div className="rounded-2xl border p-6 shadow-sm bg-red-50">
            <p className="text-red-700 font-semibold">Error</p>
            <p className="text-red-700/90 text-sm mt-1">{errorMsg}</p>
          </div>
        )}
        {!loading && !errorMsg && items.length === 0 && (
          <div className="rounded-2xl border p-6 shadow-sm">
            <p className="text-gray-800">
              No items found for <span className="font-semibold">{code}</span>.
            </p>
            <p className="text-gray-500 text-sm mt-1">Try a different code or check your data.</p>
          </div>
        )}

        {/* Items */}
        <div className="mt-4 space-y-6">
          {items.map((item, idx) => {
            const { statement, prompt, question } = deriveTexts(item);
            const picked = answers[item.id];
            const isRevealed = revealed[item.id] || false;
            const correctKey = item.correct_key;

            return (
              <div key={item.id} className="rounded-2xl border p-5 shadow-sm bg-white">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-medium text-gray-500">{code} • Q{idx + 1}</div>
                  {isRevealed && (
                    <div className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                      Answer: <span className="font-semibold">{correctKey}</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="mt-2">
                  {/* Scenario / Statement */}
                  {statement && (
                    <p className="text-[15px] text-gray-700">
                      <span className="font-semibold text-gray-800">Scenario:</span>{" "}
                      {statement}
                    </p>
                  )}

                  {/* Question / Prompt */}
                  <p className={`mt-2 text-[16px] ${question ? "font-semibold text-gray-900" : "text-gray-900"}`}>
                    {prompt}
                  </p>

                  {/* Choices */}
                  <div className="mt-3 grid gap-2">
                    {(["A", "B", "C", "D"] as const).map((label) => {
                      const text = pretty(item.choices[label]);
                      if (!text) return null;
                      const selected = picked === label;
                      const isCorrect = label === correctKey;
                      const showColor = isRevealed && (selected || isCorrect);

                      return (
                        <label
                          key={label}
                          className={[
                            "flex items-start gap-3 rounded-xl border px-3 py-2 cursor-pointer transition",
                            showColor
                              ? isCorrect
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-red-400 bg-red-50"
                              : "hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name={`q-${item.id}`}
                            className="mt-1"
                            checked={selected || false}
                            onChange={() => setAnswers((prev) => ({ ...prev, [item.id]: label }))}
                            disabled={isRevealed}
                          />
                          <div className="text-[15px]">
                            <span className="font-semibold mr-1">{label}.</span>
                            <span>{text}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => setRevealed((prev) => ({ ...prev, [item.id]: true }))}
                      disabled={isRevealed || !picked}
                      className="rounded-xl bg-black px-4 py-2 text-white text-sm hover:opacity-90 disabled:opacity-40 transition"
                    >
                      {isRevealed ? "Revealed" : "Reveal answer"}
                    </button>
                    {isRevealed && (
                      <button
                        onClick={() => {
                          setRevealed((p) => ({ ...p, [item.id]: false }));
                          setAnswers((p) => ({ ...p, [item.id]: undefined }));
                        }}
                        className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 transition"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Rationales */}
                  {isRevealed && (
                    <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                      {pretty(item.rationale_correct) && (
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-emerald-700">
                            Why the correct answer is correct
                          </p>
                          <p className="text-sm text-gray-800 mt-1">{item.rationale_correct}</p>
                        </div>
                      )}
                      <div className="grid gap-2">
                        {(["A", "B", "C", "D"] as const).map((k) => {
                          const txt = pretty(item.rationale_distractors[k]);
                          if (!txt) return null;
                          return (
                            <div key={k}>
                              <p className="text-[13px] text-gray-700">
                                <span className="font-semibold mr-1">{k}:</span>
                                {txt}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
};

export default QuizPage;
