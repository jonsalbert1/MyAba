// pages/quiz/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

/* =========================
   Types / constants
========================= */

type DomainLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

const DOMAIN_COUNTS: Record<DomainLetter, number> = {
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

const DOMAIN_ORDER: DomainLetter[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
];

type SubdomainProgress = {
  code: string; // e.g., "B07"
  done: boolean;
  bestAccuracy: number | null;
  hasLive: boolean;
};

type DomainProgress = {
  domain: DomainLetter;
  title: string;
  subdomains: SubdomainProgress[];
  completedCount: number;
  avgBestAccuracy: number | null;
  nextCode: string | null; // first subdomain not done
};

/* =========================
   Helpers
========================= */

function buildCode(domain: DomainLetter, index: number): string {
  return `${domain}${index.toString().padStart(2, "0")}`;
}

function loadDomainProgress(domain: DomainLetter): DomainProgress {
  const count = DOMAIN_COUNTS[domain];
  const subdomains: SubdomainProgress[] = [];

  for (let i = 1; i <= count; i++) {
    const code = buildCode(domain, i);
    const doneKey = `quiz:done:${domain}:${code}`;
    const accKey = `quiz:accuracy:${domain}:${code}`;
    const liveKey = `quiz:live:${domain}:${code}`;

    let done = false;
    let bestAccuracy: number | null = null;
    let hasLive = false;

    try {
      done = window.localStorage.getItem(doneKey) === "1";

      const accRaw = window.localStorage.getItem(accKey);
      if (accRaw != null && accRaw !== "") {
        const n = Number(accRaw);
        if (Number.isFinite(n)) {
          bestAccuracy = n;
        }
      }

      const liveRaw = window.localStorage.getItem(liveKey);
      if (liveRaw) {
        try {
          const parsed = JSON.parse(liveRaw);
          if (
            typeof parsed?.answeredCount === "number" &&
            parsed.answeredCount > 0
          ) {
            hasLive = true;
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // ignore localStorage errors
    }

    subdomains.push({
      code,
      done,
      bestAccuracy,
      hasLive,
    });
  }

  const completed = subdomains.filter((s) => s.done);
  const completedCount = completed.length;

  let avgBest: number | null = null;
  if (completed.length > 0) {
    const sum = completed.reduce(
      (total, s) => total + (s.bestAccuracy ?? 0),
      0
    );
    avgBest = sum / completed.length;
  }

  // First subdomain that is NOT done is the "next up"
  const next = subdomains.find((s) => !s.done) ?? null;
  const nextCode = next ? next.code : null;

  return {
    domain,
    title: getDomainTitle(domain) ?? `Domain ${domain}`,
    subdomains,
    completedCount,
    avgBestAccuracy: avgBest,
    nextCode,
  };
}

/* =========================
   Component
========================= */

export default function QuizHomePage() {
  const router = useRouter();
  const user = useUser();

  const [progress, setProgress] = useState<DomainProgress[]>([]);
  const [loadedLocal, setLoadedLocal] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const all: DomainProgress[] = DOMAIN_ORDER.map((d) =>
      loadDomainProgress(d)
    );
    setProgress(all);
    setLoadedLocal(true);
  }, []);

  const handleOpenSubdomain = (domain: DomainLetter, code: string) => {
    router.push({
      pathname: "/quiz/runner",
      query: { code },
    });
  };

  const handleResetAllLocal = () => {
    if (typeof window === "undefined") return;
    if (
      !window.confirm(
        "This will clear all local quiz progress (including best scores and in-progress states). Server history will remain. Continue?"
      )
    ) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      Object.keys(window.localStorage).forEach((key) => {
        if (
          key.startsWith("quiz:done:") ||
          key.startsWith("quiz:accuracy:") ||
          key.startsWith("quiz:live:")
        ) {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }

    // Reload view after reset
    const all: DomainProgress[] = DOMAIN_ORDER.map((d) =>
      loadDomainProgress(d)
    );
    setProgress(all);
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email ||
    "there";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header / greeting */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">BCBA Quiz Suite</h1>
        <p className="text-sm text-gray-700">
          Welcome, <span className="font-semibold">{displayName}</span>. Choose
          a domain and subdomain to practice. Your best scores and in-progress
          quizzes are tracked locally and on the server.
        </p>
      </header>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          Progress shown from local device storage.
        </div>
        <button
          type="button"
          onClick={handleResetAllLocal}
          className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Reset all local quiz data
        </button>
      </div>

      {/* Domains summary cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {progress.map((dom) => {
          const totalSubs = DOMAIN_COUNTS[dom.domain];
          const done = dom.completedCount;
          const percentDone =
            totalSubs > 0 ? Math.round((done / totalSubs) * 100) : 0;

          return (
            <div
              key={dom.domain}
              className="flex flex-col rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Domain {dom.domain}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {dom.title}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>
                    Completed:{" "}
                    <span className="font-semibold">
                      {done}/{totalSubs}
                    </span>
                  </div>
                  <div>
                    Avg best:{" "}
                    <span className="font-semibold">
                      {dom.avgBestAccuracy != null
                        ? `${dom.avgBestAccuracy.toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className="h-1.5 rounded bg-blue-600 transition-all"
                  style={{ width: `${percentDone}%` }}
                />
              </div>

              {dom.nextCode && (
                <button
                  type="button"
                  onClick={() => handleOpenSubdomain(dom.domain, dom.nextCode!)}
                  className="mt-3 inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Next up: {dom.nextCode}
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* Detailed TOC table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subdomain table of contents</h2>
        {!loadedLocal && (
          <p className="text-xs text-gray-500">
            Loading local progress…
          </p>
        )}

        {progress.map((dom) => (
          <div
            key={`table-${dom.domain}`}
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold">
              Domain {dom.domain} · {dom.title}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-2 py-1">Code</th>
                    <th className="px-2 py-1">Subdomain</th>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1 text-right">Best</th>
                    <th className="px-2 py-1 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dom.subdomains.map((sub) => {
                    const text = getSubdomainText(sub.code) ?? sub.code;

                    let statusLabel = "Not started";
                    let statusClass =
                      "inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700";

                    if (sub.done) {
                      statusLabel = "Completed";
                      statusClass =
                        "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700";
                    } else if (sub.hasLive) {
                      statusLabel = "In progress";
                      statusClass =
                        "inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700";
                    }

                    let buttonLabel = "Start";
                    if (sub.done) buttonLabel = "Retake";
                    else if (sub.hasLive) buttonLabel = "Continue";

                    return (
                      <tr key={sub.code} className="border-b last:border-0">
                        <td className="px-2 py-1 align-top font-mono text-[11px]">
                          {sub.code}
                        </td>
                        <td className="px-2 py-1 align-top">
                          <div className="max-w-xl whitespace-pre-line">
                            {text}
                          </div>
                        </td>
                        <td className="px-2 py-1 align-top">
                          <span className={statusClass}>{statusLabel}</span>
                        </td>
                        <td className="px-2 py-1 align-top text-right">
                          {sub.bestAccuracy != null
                            ? `${sub.bestAccuracy.toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenSubdomain(dom.domain, sub.code)
                            }
                            className="rounded-md border px-2 py-0.5 text-[11px] font-semibold hover:bg-gray-50"
                          >
                            {buttonLabel}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
