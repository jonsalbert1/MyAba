// pages/quiz/index.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  QUIZ_SECTIONS,
  remainingFor,
  overallProgressPercent,
} from "../../utils/quizToc";

export default function QuizTOC() {
  const [remMap, setRemMap] = useState<Record<string, number>>({});
  const [overallPct, setOverallPct] = useState(0);

  useEffect(() => {
    // compute from localStorage on mount
    const map: Record<string, number> = {};
    for (const s of QUIZ_SECTIONS) map[s.id] = remainingFor(s.id);
    setRemMap(map);
    setOverallPct(overallProgressPercent());
  }, []);

  return (
    <>
      <Head>
        <title>Course • myABA Study Suite</title>
      </Head>

      <main className="mx-auto max-w-md p-4 pb-24">
        <h1 className="text-center text-2xl font-semibold mb-4">Course</h1>

        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium text-zinc-500">Section Name</span>
            <span className="rounded-full bg-slate-600 px-3 py-1 text-xs font-semibold text-white">
              Chapters Remaining
            </span>
          </div>

          <ul className="divide-y">
            {QUIZ_SECTIONS.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-slate-600 flex items-center justify-center text-white text-xl">
                  <span aria-hidden>{s.icon ?? "📘"}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium">
                    {s.id}. {s.title}
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-600/90 px-2 text-xs font-bold text-white">
                    {remMap[s.id] ?? 0}
                  </span>
                </div>

                <Link
                  href={`/quiz/section/${s.id}`}
                  className="ml-2 shrink-0 text-zinc-400"
                  aria-label={`Open Section ${s.id}`}
                >
                  ❯
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress bar pinned bottom like screenshot */}
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-4">
          <div className="rounded-xl bg-zinc-200">
            <div
              className="h-8 rounded-xl bg-emerald-200"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="mt-1 text-center text-sm font-semibold">{overallPct}%</div>

          {/* Fake tabbar icons for now */}
          <div className="mt-2 grid grid-cols-3 text-center text-zinc-500">
            <div>🏠<div className="text-xs">Home</div></div>
            <div className="text-slate-700">📖<div className="text-xs">Course</div></div>
            <div>⚙️<div className="text-xs">Settings</div></div>
          </div>
        </div>
      </main>
    </>
  );
}
