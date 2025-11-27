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
  code: string;
  done: boolean;
  bestAccuracy: number | null;
  hasLive: boolean;
  lastUpdated: number | null;
};

type DomainProgress = {
  domain: DomainLetter;
  title: string;
  subdomains: SubdomainProgress[];
  completedCount: number;
  avgBestAccuracy: number | null;
  nextCode: string | null;
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
    let lastUpdated: number | null = null;

    try {
      done = window.localStorage.getItem(doneKey) === "1";

      const accRaw = window.localStorage.getItem(accKey);
      if (accRaw != null && accRaw !== "") {
        const n = Number(accRaw);
        if (Number.isFinite(n)) bestAccuracy = n;
      }

      const liveRaw = window.localStorage.getItem(liveKey);
      if (liveRaw) {
        try {
          const parsed = JSON.parse(liveRaw);
          if (typeof parsed?.answeredCount === "number" && parsed.answeredCount > 0) {
            hasLive = true;
            if (typeof parsed.lastUpdated === "number") {
              lastUpdated = parsed.lastUpdated;
            }
          }
        } catch {}
      }
    } catch {}

    subdomains.push({
      code,
      done,
      bestAccuracy,
      hasLive,
      lastUpdated,
    });
  }

  const completedCount = subdomains.filter((s) => s.done).length;

  let avgBest: number | null = null;
  const doneSubs = subdomains.filter((s) => s.done && s.bestAccuracy != null);
  if (doneSubs.length > 0) {
    const sum = doneSubs.reduce((total, s) => total + (s.bestAccuracy ?? 0), 0);
    avgBest = sum / doneSubs.length;
  }

  const nextCode = subdomains.find((s) => !s.done)?.code ?? null;

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const all = DOMAIN_ORDER.map((d) => loadDomainProgress(d));
    setProgress(all);
    setLoadedLocal(true);
  }, []);

  const handleOpenDomain = (domain: DomainLetter) => {
    router.push(`/quiz/${domain}`);
  };

  const handleOpenSubdomain = (_domain: DomainLetter, code: string) => {
    router.push({
      pathname: "/quiz/runner",
      query: { code },
    });
  };

  const handleResetAllLocal = () => {
    if (typeof window === "undefined") return;

    if (!window.confirm("This will clear all local quiz progress. Continue?")) return;

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

    const all = DOMAIN_ORDER.map((d) => loadDomainProgress(d));
    setProgress(all);
  };

  const displayName = user?.user_metadata?.full_name || user?.email || "there";

  // Overall stats
  const totalSubdomains = DOMAIN_ORDER.reduce((sum, d) => sum + DOMAIN_COUNTS[d], 0);
  const totalCompleted = progress.reduce((sum, dom) => sum + dom.completedCount, 0);

  const allAcc: number[] = [];
  progress.forEach((dom) =>
    dom.subdomains.forEach((s) => {
      if (s.done && s.bestAccuracy != null) allAcc.push(s.bestAccuracy);
    })
  );
  const overallAvgAccuracy =
    allAcc.length > 0 ? allAcc.reduce((a, b) => a + b, 0) / allAcc.length : null;

  // Last in-progress
  let lastActiveDomain: DomainLetter | null = null;
  let lastActiveCode: string | null = null;
  let lastTs = 0;
  progress.forEach((dom) =>
    dom.subdomains.forEach((s) => {
      if (s.hasLive && s.lastUpdated && s.lastUpdated > lastTs) {
        lastTs = s.lastUpdated;
        lastActiveDomain = dom.domain;
        lastActiveCode = s.code;
      }
    })
  );
  const hasAnyInProgress = lastActiveDomain && lastActiveCode;
  const lastActiveText =
    lastActiveCode != null ? getSubdomainText(lastActiveCode) ?? "" : "";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">BCBA Quiz Suite</h1>
        <p className="text-sm text-gray-700">
          Welcome, <span className="font-semibold">{displayName}</span>.
        </p>
      </header>

      {/* Top Stats */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Overall progress
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {totalCompleted}/{totalSubdomains}
          </p>
          <div className="mt-3 h-1.5 w-full rounded bg-gray-200 overflow-hidden">
            <div
              className="h-1.5 bg-blue-600"
              style={{
                width:
                  totalSubdomains > 0
                    ? `${Math.round((totalCompleted / totalSubdomains) * 100)}%`
                    : "0%",
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Average best accuracy
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {overallAvgAccuracy != null ? `${overallAvgAccuracy.toFixed(0)}%` : "—"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Domains completed
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {
              progress.filter(
                (dom) => dom.completedCount === DOMAIN_COUNTS[dom.domain]
              ).length
            }
            /{DOMAIN_ORDER.length}
          </p>
        </div>

        {/* Continue */}
        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Continue</p>
            {hasAnyInProgress ? (
              <>
                <p className="mt-2 text-sm font-semibold">Resume your last quiz</p>
                <p className="text-xs text-gray-600 mt-1">
                  Domain {lastActiveDomain} · {lastActiveCode}
                  {lastActiveText && (
                    <>
                      {" — "}
                      <span className="italic">{lastActiveText}</span>
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-semibold">No quiz in progress</p>
                <p className="text-xs text-gray-600 mt-1">
                  Start with “Next up” from a domain card.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={!hasAnyInProgress}
            onClick={() =>
              lastActiveDomain &&
              lastActiveCode &&
              handleOpenSubdomain(lastActiveDomain, lastActiveCode)
            }
            className="mt-3 w-full rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            {hasAnyInProgress
              ? `Continue: ${lastActiveCode}${
                  lastActiveText ? ` — ${lastActiveText}` : ""
                }`
              : "No active quiz"}
          </button>
        </div>
      </section>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Progress shown from local device storage.
        </span>
        <button
          type="button"
          onClick={handleResetAllLocal}
          className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Reset all local quiz data
        </button>
      </div>

      {/* Domain Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {progress.map((dom) => {
          const totalSubs = DOMAIN_COUNTS[dom.domain];
          const done = dom.completedCount;
          const percentDone =
            totalSubs > 0 ? Math.round((done / totalSubs) * 100) : 0;
          const accuracy = dom.avgBestAccuracy ?? 0;

          const hasAnyLive = dom.subdomains.some((s) => s.hasLive && !s.done);
          const summaryButtonLabel = hasAnyLive ? "Continue" : "Next up";

          const nextSubText =
            dom.nextCode != null ? getSubdomainText(dom.nextCode) ?? "" : "";

          return (
            <div
              key={dom.domain}
              onClick={() => handleOpenDomain(dom.domain)}
              className="relative flex flex-col rounded-xl border bg-white p-4 shadow-sm cursor-pointer hover:bg-blue-50 transition"
            >
              <div className="pointer-events-none">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Domain {dom.domain}
                    </p>
                    <p className="text-sm font-medium">{dom.title}</p>
                  </div>
                  <div className="text-xs text-right text-gray-500">
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

                <div className="mt-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Completion</span>
                      <span>{percentDone}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-600"
                        style={{ width: `${percentDone}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Accuracy</span>
                      <span>
                        {dom.avgBestAccuracy != null
                          ? `${dom.avgBestAccuracy.toFixed(0)}%`
                          : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-1.5 bg-emerald-500"
                        style={{
                          width:
                            dom.avgBestAccuracy != null
                              ? `${Math.min(Math.max(accuracy, 0), 100)}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {dom.nextCode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSubdomain(dom.domain, dom.nextCode!);
                  }}
                  className="pointer-events-auto mt-3 rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {summaryButtonLabel}: {dom.nextCode}
                  {nextSubText && ` — ${nextSubText}`}
                </button>
              )}
            </div>
          );
        })}
      </section>

      {!loadedLocal && (
        <p className="text-xs text-gray-500 mt-2">Loading local progress…</p>
      )}
    </main>
  );
}
