// pages/quiz/section/[id].tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  QUIZ_SECTIONS,
  getScore,
  setScore,
  getFav,
  toggleFav,
  sectionProgressPercent,
} from "../../../utils/quizToc";

function ScorePill({ score }: { score: string | null }) {
  if (!score) {
    return (
      <span className="rounded-full bg-slate-600/80 px-2 py-1 text-xs font-bold text-white">
        0/10
      </span>
    );
  }
  const [num, den] = score.split("/");
  const n = parseInt(num || "0", 10);
  const good = n >= 8; // green if ≥8/10 like screenshot
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        good ? "bg-emerald-500 text-white" : "bg-slate-600/80 text-white"
      }`}
    >
      {score}
    </span>
  );
}

export default function QuizSection() {
  const { query, back } = useRouter();
  const id = String(query.id || "").toUpperCase();

  const sec = QUIZ_SECTIONS.find((s) => s.id === id);
  const [scores, setScores] = useState<Record<string, string | null>>({});
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!sec) return;
    const sMap: Record<string, string | null> = {};
    const fMap: Record<string, boolean> = {};
    for (const item of sec.items) {
      sMap[item.code] = getScore(item.code);
      fMap[item.code] = getFav(item.code);
    }
    setScores(sMap);
    setFavs(fMap);
    setPct(sectionProgressPercent(sec.id));
  }, [id]);

  if (!sec) {
    return (
      <>
        <Head><title>Section • myABA</title></Head>
        <main className="mx-auto max-w-md p-4">
          <p className="text-sm text-red-600">Unknown section.</p>
          <Link className="text-blue-600 underline" href="/quiz">Back to Course</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Section {sec.id} • myABA</title>
      </Head>

      <main className="mx-auto max-w-md p-4 pb-24">
        <div className="flex items-center gap-2">
          <button onClick={() => back()} className="text-blue-600">‹ Course</button>
          <h1 className="ml-2 text-xl font-semibold">Section {sec.id}</h1>
        </div>

        <h2 className="mt-4 mb-2 text-2xl font-extrabold">Quizzes</h2>

        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {sec.items.map((item) => (
            <li key={item.code} className="flex items-center gap-3 px-4 py-3">
              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium">
                  {item.code}. {item.title}
                </div>
              </div>

              {/* Star favorite */}
              <button
                className="mr-2 text-yellow-500"
                aria-label="Favorite"
                onClick={() => {
                  const next = toggleFav(item.code);
                  setFavs((p) => ({ ...p, [item.code]: next }));
                }}
                title="Favorite"
              >
                {favs[item.code] ? "⭐" : "☆"}
              </button>

              {/* Score pill */}
              <ScorePill score={scores[item.code] ?? null} />

              {/* Chevron */}
              <Link
                className="ml-2 text-zinc-400"
                href={`/quiz/take/${item.code}`} // your quiz runner route
                aria-label={`Open ${item.code}`}
              >
                ❯
              </Link>
            </li>
          ))}
        </ul>

        {/* Bottom progress like screenshot */}
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-4">
          <div className="rounded-xl bg-zinc-200">
            <div className="h-8 rounded-xl bg-emerald-200" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-center text-sm font-semibold">{pct}%</div>
          <div className="mt-2 grid grid-cols-3 text-center text-zinc-500">
            <Link href="/" className="block">🏠<div className="text-xs">Home</div></Link>
            <Link href="/quiz" className="block text-slate-700">📖<div className="text-xs">Course</div></Link>
            <Link href="/settings" className="block">⚙️<div className="text-xs">Settings</div></Link>
          </div>
        </div>

        {/* Dev helper: quick set score (remove once wired to API) */}
        <div className="mt-4 text-xs text-zinc-500">
          Tip: set a score by running in console, e.g.
          <code className="ml-1 rounded bg-zinc-100 px-1">localStorage.setItem("quizScore:A1","9/10")</code>
        </div>
      </main>
    </>
  );
}
