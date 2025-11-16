// pages/quiz/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getDomainTitle } from "@/lib/tco";

type DomainLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

const COUNTS: Record<DomainLetter, number> = {
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

type DomainStats = {
  letter: DomainLetter;
  title: string;
  totalSubdomains: number;
  completedSubdomains: number;
  bestAccuracy: number | null;
  lastCode: string; // e.g., "B7"
};

function makeDefaultStats(letter: DomainLetter): DomainStats {
  const totalSubdomains = COUNTS[letter];
  return {
    letter,
    title: getDomainTitle(letter) ?? "",
    totalSubdomains,
    completedSubdomains: 0,
    bestAccuracy: null,
    lastCode: `${letter}1`,
  };
}

export default function QuizTocPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Record<DomainLetter, DomainStats>>(() => {
    const init: Partial<Record<DomainLetter, DomainStats>> = {};
    (Object.keys(COUNTS) as DomainLetter[]).forEach((L) => {
      init[L] = makeDefaultStats(L);
    });
    return init as Record<DomainLetter, DomainStats>;
  });

  // Hydrate from localStorage on the client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updated: Partial<Record<DomainLetter, DomainStats>> = {};

    (Object.keys(COUNTS) as DomainLetter[]).forEach((L) => {
      const base = makeDefaultStats(L);
      let completed = 0;
      let bestAcc: number | null = null;

      const totalSubdomains = COUNTS[L];

      for (let i = 1; i <= totalSubdomains; i++) {
        const code = `${L}${i}`;
        const doneKey = `quiz:done:${L}:${code}`;
        const accKey = `quiz:accuracy:${L}:${code}`;

        const done = window.localStorage.getItem(doneKey) === "1";
        if (done) completed += 1;

        const accStr = window.localStorage.getItem(accKey);
        if (accStr != null) {
          const val = Number(accStr);
          if (Number.isFinite(val)) {
            bestAcc = bestAcc == null ? val : Math.max(bestAcc, val);
          }
        }
      }

      const lastCode =
        window.localStorage.getItem(`quiz:lastCode:${L}`) || `${L}1`;

      updated[L] = {
        letter: L,
        title: base.title,
        totalSubdomains,
        completedSubdomains: completed,
        bestAccuracy: bestAcc,
        lastCode,
      };
    });

    setStats((prev) => ({ ...prev, ...(updated as any) }));
  }, []);

  const domains = useMemo(
    () => (Object.keys(COUNTS) as DomainLetter[]).map((L) => stats[L]),
    [stats]
  );

  // Overall progress
  const overall = useMemo(() => {
    const totalSubdomains = (Object.keys(COUNTS) as DomainLetter[]).reduce(
      (acc, L) => acc + COUNTS[L],
      0
    );
    const completedSubdomains = domains.reduce(
      (acc, d) => acc + d.completedSubdomains,
      0
    );
    const percent = totalSubdomains
      ? Math.round((completedSubdomains / totalSubdomains) * 100)
      : 0;

    return { totalSubdomains, completedSubdomains, percent };
  }, [domains]);

  function goToCode(code: string) {
    router.push({
      pathname: "/quiz/runner",
      query: { code },
    });
  }

  function handleStart(letter: DomainLetter) {
    goToCode(`${letter}1`);
  }

  function handleResume(d: DomainStats) {
    goToCode(d.lastCode);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          BCBA Quiz – Table of Contents
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose a domain to practice. Progress is saved locally per subdomain
          (A1–I{COUNTS.I}) and used to auto-resume your last code in each
          domain.
        </p>
      </header>

      {/* Overall progress */}
      <section className="mb-6 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-medium">Overall progress</span>{" "}
            <span className="text-gray-600">
              · Completed{" "}
              <strong>{overall.completedSubdomains}</strong> /{" "}
              {overall.totalSubdomains} subdomains
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {overall.percent}% complete
          </div>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
          <div
            className="h-2 rounded bg-blue-500 transition-all"
            style={{ width: `${overall.percent}%` }}
          />
        </div>
      </section>

      {/* Domains grid */}
      <section className="grid gap-4 md:grid-cols-2">
        {domains.map((d) => {
          const completionPct = d.totalSubdomains
            ? Math.round((d.completedSubdomains / d.totalSubdomains) * 100)
            : 0;
          const isStarted =
            d.completedSubdomains > 0 || d.bestAccuracy != null;

          return (
            <div
              key={d.letter}
              className="group flex flex-col items-stretch rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                      {d.letter}
                    </span>
                    <h2 className="text-sm font-semibold">
                      Domain {d.letter}
                    </h2>
                  </div>
                  {d.title && (
                    <p className="mt-1 text-xs text-gray-600">{d.title}</p>
                  )}
                </div>
                <div className="text-right text-[11px] text-gray-500">
                  <div>
                    {d.completedSubdomains} / {d.totalSubdomains} done
                  </div>
                  <div>
                    Best:{" "}
                    {d.bestAccuracy != null ? `${d.bestAccuracy}%` : "—"}
                  </div>
                </div>
              </div>

              {/* Domain progress bar */}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className="h-1.5 rounded bg-green-500 transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>

              {/* Footer actions */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <div className="flex flex-col">
                  {isStarted ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResume(d)}
                        className="text-left font-medium text-blue-700 underline-offset-2 hover:underline"
                      >
                        Resume at {d.lastCode}
                      </button>
                      <span className="text-[11px] text-gray-400">
                        Use “Start fresh” to restart at {d.letter}1
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Start at {d.letter}1</span>
                      <span className="text-[11px] text-gray-400">
                        Click “Start fresh” to begin this domain
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleStart(d.letter)}
                  className="rounded-md border px-2.5 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50"
                >
                  Start fresh at {d.letter}1
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
