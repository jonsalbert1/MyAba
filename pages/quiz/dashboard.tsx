import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Keep it plain (no TS Record<> annotations)
const DOMAINS = {
  A: "Behaviorism and Philosophical Foundations",
  B: "Concepts and Principles",
  C: "Measurement, Data Display, and Interpretation",
  D: "Experimental Design",
  E: "Ethical and Professional Issues",
  F: "Behavior Assessment",
  G: "Behavior-Change Procedures",
  H: "Selecting and Implementing Interventions",
  I: "Personnel Supervision and Management",
};

const SUBCOUNTS: Record<string, number> = {
  A: 5, B: 24, C: 12, D: 9, E: 12, F: 8, G: 19, H: 8, I: 7,
};

type DomainStat = {
  completed: number;
  accuracyPercent: number;
  lastCode: string;
};

type StatsMap = Record<string, DomainStat>;

function makeSubdomains(domain: string): string[] {
  const total = SUBCOUNTS[domain] ?? 0;
  return Array.from({ length: total }, (_, i) => `${domain}${i + 1}`);
}

function defaultDomainStat(domain: string): DomainStat {
  const first = `${domain}1`;
  return { completed: 0, accuracyPercent: 0, lastCode: first };
}

function isSubdomainDone(domain: string, code: string): boolean {
  try {
    return localStorage.getItem(`quiz:done:${domain}:${code}`) === "1";
  } catch {
    return false;
  }
}

function loadStatsFromStorage(): StatsMap {
  const entries = Object.keys(DOMAINS).map((d) => {
    const lastCode =
      localStorage.getItem(`quiz:lastCode:${d}`) || defaultDomainStat(d).lastCode;

    const codes = makeSubdomains(d);
    const completed = codes.reduce(
      (acc, code) => acc + (isSubdomainDone(d, code) ? 1 : 0),
      0
    );

    const accuracyStr = localStorage.getItem(`quiz:accuracy:${d}`);
    const accuracyPercent = Number.isFinite(Number(accuracyStr))
      ? Number(accuracyStr)
      : 0;

    return [d, { completed, accuracyPercent, lastCode }] as const;
  });

  return Object.fromEntries(entries) as StatsMap;
}

export default function QuizDashboard() {
  const [stats, setStats] = useState<StatsMap>({});
  const [doneMap, setDoneMap] = useState<Record<string, Record<string, boolean>>>({});

  // Initial load (localStorage)
  useEffect(() => {
    try {
      const s = loadStatsFromStorage();
      setStats(s);

      const map: Record<string, Record<string, boolean>> = {};
      for (const d of Object.keys(DOMAINS)) {
        map[d] = {};
        for (const code of makeSubdomains(d)) {
          map[d][code] = isSubdomainDone(d, code);
        }
      }
      setDoneMap(map);
    } catch {
      // noop
    }
  }, []);

  // React to local changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key.startsWith("quiz:done:") ||
        e.key.startsWith("quiz:lastCode:") ||
        e.key.startsWith("quiz:accuracy:")
      ) {
        const s = loadStatsFromStorage();
        setStats(s);

        const map: Record<string, Record<string, boolean>> = {};
        for (const d of Object.keys(DOMAINS)) {
          map[d] = {};
          for (const code of makeSubdomains(d)) {
            map[d][code] = isSubdomainDone(d, code);
          }
        }
        setDoneMap(map);
      }
    };
    const onLocal = () => {
      const s = loadStatsFromStorage();
      setStats(s);
      const map: Record<string, Record<string, boolean>> = {};
      for (const d of Object.keys(DOMAINS)) {
        map[d] = {};
        for (const code of makeSubdomains(d)) {
          map[d][code] = isSubdomainDone(d, code);
        }
      }
      setDoneMap(map);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("quiz-progress-updated", onLocal as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("quiz-progress-updated", onLocal as EventListener);
    };
  }, []);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const d of Object.keys(DOMAINS)) t[d] = SUBCOUNTS[d] ?? 0;
    return t;
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Quiz Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your progress by domain, jump back to where you left off, or browse all subdomains.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link href="/quiz/run?mode=all" className="block rounded-2xl border p-4 shadow-sm hover:shadow transition">
          <div className="text-lg font-medium">Entire Set of Quizzes</div>
          <p className="text-sm text-gray-600">Run across all domains.</p>
        </Link>
        <Link href="/quiz/run?mode=random" className="block rounded-2xl border p-4 shadow-sm hover:shadow transition">
          <div className="text-lg font-medium">Random Quiz</div>
          <p className="text-sm text-gray-600">Mix it up—randomized items.</p>
        </Link>
        <Link href="/quiz/run?mode=missed" className="block rounded-2xl border p-4 shadow-sm hover:shadow transition">
          <div className="text-lg font-medium">Missed Questions</div>
          <p className="text-sm text-gray-600">Review items you missed.</p>
        </Link>
      </section>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-black" />
          <span>Current subdomain</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
          <span aria-hidden>✅</span>
          <span>Completed</span>
        </span>
      </div>

      <section className="mb-12 grid gap-4 md:grid-cols-2">
        {Object.entries(DOMAINS).map(([domain, label]) => {
          const s = stats[domain] ?? defaultDomainStat(domain);
          const total = totals[domain] || 0;
          const pctComplete =
            total > 0 ? Math.min(100, Math.round((s.completed / total) * 100)) : 0;

          return (
            <article key={domain} className="rounded-2xl border p-5 shadow-sm hover:shadow transition">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{domain}. {label}</h2>
                  <p className="text-sm text-gray-600">
                    {s.completed}/{total} subdomains completed · Accuracy {s.accuracyPercent}%
                  </p>
                </div>

                <Link href={`/quiz/runner?code=${s.lastCode}`} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
                  Continue: {s.lastCode}
                </Link>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-gray-800"
                  style={{ width: `${pctComplete}%` }}
                  aria-label={`Progress ${pctComplete}%`}
                />
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer select-none text-sm font-medium">View subdomains</summary>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                  {makeSubdomains(domain).map((code) => {
                    const isCurrent = code === s.lastCode;
                    const isDone = doneMap[domain]?.[code] ?? false;
                    return (
                      <li key={code}>
                        <Link
                          href={`/quiz/runner?code=${code}`}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition ${
                            isCurrent
                              ? "bg-black text-white border-black font-medium shadow-sm"
                              : "hover:bg-gray-50"
                          }`}
                          title={isDone ? "Completed" : "Not completed"}
                        >
                          {isCurrent && <span>📍</span>}
                          <span>{code}</span>
                          {isDone && <span aria-hidden>✅</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </article>
          );
        })}
      </section>

      <section className="mb-16">
        <h3 className="text-2xl font-semibold mb-4">All Subdomains (TOC)</h3>
        <div className="space-y-6">
          {Object.entries(DOMAINS).map(([domain, label]) => {
            const s = stats[domain] ?? defaultDomainStat(domain);
            return (
              <div key={domain} className="rounded-2xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-lg font-medium">{domain}. {label}</span>
                  <span className="text-xs text-gray-500">Last visited: {s.lastCode}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {makeSubdomains(domain).map((code) => {
                    const isCurrent = code === s.lastCode;
                    const isDone = doneMap[domain]?.[code] ?? false;
                    return (
                      <Link
                        key={code}
                        href={`/quiz/runner?code=${code}`}
                        className={`rounded-lg border px-2 py-1 text-sm transition inline-flex items-center gap-1 ${
                          isCurrent
                            ? "bg-black text-white border-black font-medium shadow-sm"
                            : "hover:bg-gray-50"
                        }`}
                        title={isDone ? "Completed" : "Not completed"}
                      >
                        {isCurrent && <span>📍</span>}
                        <span>{code}</span>
                        {isDone && <span aria-hidden>✅</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
