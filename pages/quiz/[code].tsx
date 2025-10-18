// pages/quiz/[code].tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type ChoiceKey = "A" | "B" | "C" | "D";

type Item = {
  id: string;
  stem: string;
  choices: Record<ChoiceKey, string>;
  correct_key: ChoiceKey;
  rationale_correct?: string;
  rationale_distractors?: Partial<Record<ChoiceKey, string>>;
};

type Subdomain = {
  code: string;        // "A1"
  domain: string;      // "A"
  label: string;
  target_items: number;
};

type QuizApi = { ok: true; subdomain: Subdomain; items: Item[] } | { ok: false; error: string };
type MetaApi = {
  ok: boolean;
  domains: Record<
    string,
    { domain: string; domain_title: string; subdomains: Array<{ code: string }> }
  >;
};

export default function QuizByCode() {
  const { query } = useRouter();
  const code = String(query.code || "").toUpperCase();

  const [data, setData] = useState<QuizApi | null>(null);
  const [meta, setMeta] = useState<MetaApi | null>(null);

  const items = (data as any)?.items as Item[] | undefined;
  const sub = (data as any)?.subdomain as Subdomain | undefined;

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<ChoiceKey | null>(null);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const r = await fetch(`/api/quiz?code=${code}`);
      const j = (await r.json()) as QuizApi;
      setData(j);
      setIndex(0);
      setPicked(null);
      setCorrect(0);
    })();
    // also fetch meta for “next subdomain”
    (async () => {
      const r = await fetch("/api/subdomains");
      const j = (await r.json()) as MetaApi;
      setMeta(j);
    })();
  }, [code]);

  const current = useMemo(() => (items ? items[index] : undefined), [items, index]);
  const total = items?.length ?? sub?.target_items ?? 10;
  const atEnd = index >= total - 1;
  const isCorrect = picked && current && picked === current.correct_key;

  const onPick = (k: ChoiceKey) => {
    if (!current || picked !== null) return;
    setPicked(k);
    if (k === current.correct_key) setCorrect((c) => c + 1);
  };

  const saveProgress = () => {
    const percent = total ? Math.round((correct / total) * 100) : 0;
    try {
      const raw = localStorage.getItem("myaba.quiz.progress");
      const obj = raw ? JSON.parse(raw) : {};
      obj[code] = { total, correct, percent, completed: true, updatedAt: Date.now() };
      localStorage.setItem("myaba.quiz.progress", JSON.stringify(obj));
    } catch {
      // ignore localStorage issues
    }
  };

  const next = () => {
    if (!atEnd) {
      setPicked(null);
      setIndex((i) => Math.min(i + 1, total - 1));
    } else {
      saveProgress();
    }
  };

  const nextCodeFromMeta = (): string | null => {
    if (!meta?.domains || !sub) return null;
    const d = meta.domains[sub.domain];
    if (!d?.subdomains?.length) return null;
    const list = d.subdomains;
    const i = list.findIndex((x) => x.code === sub.code);
    const nxt = i >= 0 ? list[i + 1] : null;
    return nxt?.code || null;
  };

  if (!code) return null;

  if (!data) {
    return (
      <>
        <Head><title>{code} • Quiz • MyABA</title></Head>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border p-6 text-center text-gray-600">Loading…</div>
        </main>
      </>
    );
  }

  if (!data.ok) {
    return (
      <>
        <Head><title>{code} • Quiz • MyABA</title></Head>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border p-6 text-center text-red-700">
            {data.error || "Unable to load quiz."}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head><title>{code} • Quiz • MyABA</title></Head>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{code}</h1>
          <p className="text-gray-600">{sub?.label}</p>
        </div>

        {!current ? (
          <div className="rounded-xl border p-6 text-center">No items available yet.</div>
        ) : (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-gray-500">Question {index + 1} of {total}</div>
            <h2 className="mt-2 text-lg font-semibold">{current.stem}</h2>

            <ul className="mt-4 space-y-2">
              {(["A", "B", "C", "D"] as ChoiceKey[]).map((k) => {
                const active = picked === k;
                const correctKey = current.correct_key;
                const showOutcome = picked !== null;
                const base = "w-full rounded-lg border p-3 text-left";
                const state = !showOutcome
                  ? "hover:bg-gray-50"
                  : active && k === correctKey
                  ? "border-green-600"
                  : active && k !== correctKey
                  ? "border-red-600"
                  : k === correctKey
                  ? "border-green-600"
                  : "";
                return (
                  <li key={k}>
                    <button
                      disabled={picked !== null}
                      className={`${base} ${state}`}
                      onClick={() => onPick(k)}
                    >
                      <span className="mr-2 font-mono">{k}.</span>
                      {current.choices[k]}
                    </button>
                  </li>
                );
              })}
            </ul>

            {picked !== null && (
              <div className="mt-4 space-y-3">
                <div className={`rounded-lg border p-3 ${isCorrect ? "border-green-600" : "border-red-600"}`}>
                  <strong>{isCorrect ? "Correct" : "Not quite"}</strong>
                  <p className="mt-1 text-sm text-gray-700">
                    {current.rationale_correct || "Review the concept and try again."}
                  </p>
                </div>

                {!isCorrect && picked && current.rationale_distractors?.[picked] && (
                  <div className="rounded-lg border p-3">
                    <strong>Why {picked} is incorrect:</strong>
                    <p className="mt-1 text-sm text-gray-700">
                      {current.rationale_distractors[picked]}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <button onClick={next} className="rounded-lg border px-4 py-2 hover:bg-black hover:text-white">
                    {atEnd ? "Finish" : "Next"}
                  </button>
                  <div className="text-sm text-gray-600">
                    Score: {correct}/{total} ({Math.round((correct / total) * 100)}%)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion summary + next subdomain */}
        {atEnd && picked !== null && (
          <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{code} Completed</h3>
            <p className="mt-1 text-gray-700">
              You scored {correct} out of {total} ({Math.round((correct / total) * 100)}%).
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/quiz" className="rounded-lg border px-4 py-2 hover:bg-black hover:text-white">
                Back to Quiz
              </Link>
              {nextCodeFromMeta() && (
                <Link
                  href={`/quiz/${nextCodeFromMeta()}`}
                  className="rounded-lg border px-4 py-2 hover:bg-black hover:text-white"
                >
                  Next Subdomain → {nextCodeFromMeta()}
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
