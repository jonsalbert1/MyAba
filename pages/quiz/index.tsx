// pages/quiz/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
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
  code: string; // e.g. "A01"
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

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

type ProgressRow = {
  domain: string; // "A"
  subdomain: string; // "A01"
  best_accuracy_percent: number | null;
};

/* =========================
   Helpers
========================= */

function buildCode(domain: DomainLetter, index: number): string {
  return `${domain}${index.toString().padStart(2, "0")}`;
}

// Base skeleton so UI renders instantly
function makeEmptyDomainProgress(domain: DomainLetter): DomainProgress {
  const count = DOMAIN_COUNTS[domain];
  const subs: SubdomainProgress[] = [];

  for (let i = 1; i <= count; i++) {
    const code = buildCode(domain, i);
    subs.push({
      code,
      done: false,
      bestAccuracy: null,
      hasLive: false,
      lastUpdated: null,
    });
  }

  return {
    domain,
    title: getDomainTitle(domain) ?? `Domain ${domain}`,
    subdomains: subs,
    completedCount: 0,
    avgBestAccuracy: null,
    nextCode: subs[0]?.code ?? null,
  };
}

const INITIAL_PROGRESS: DomainProgress[] = DOMAIN_ORDER.map((d) =>
  makeEmptyDomainProgress(d)
);

/**
 * Recompute completedCount, avgBestAccuracy, nextCode
 * after we've merged Supabase + any local in-progress info.
 */
function recomputeDomainStats(base: Record<DomainLetter, DomainProgress>) {
  DOMAIN_ORDER.forEach((d) => {
    const dom = base[d];

    const doneSubs = dom.subdomains.filter((s) => s.done);
    dom.completedCount = doneSubs.length;

    if (doneSubs.length > 0) {
      const sum = doneSubs.reduce(
        (acc, s) => acc + (s.bestAccuracy ?? 0),
        0
      );
      dom.avgBestAccuracy = sum / doneSubs.length;
    } else {
      dom.avgBestAccuracy = null;
    }

    const firstIncomplete = dom.subdomains.find((s) => !s.done);
    dom.nextCode = firstIncomplete?.code ?? null;
  });
}

/* =========================
   Component
========================= */

export default function QuizHomePage() {
  const router = useRouter();
  const user = useUser();
  const supabase = useSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);

  // Domain cards: start with skeleton, then hydrate
  const [progress, setProgress] = useState<DomainProgress[]>(INITIAL_PROGRESS);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // ------- Profile: load or auto-create if missing -------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      // 1) Try to load existing profile for this user
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Quiz profile load error", error);
      }

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // 2) No profile found -> ask server to create one using supabaseAdmin
      try {
        const res = await fetch("/api/profile/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          console.error("ensure-profile failed", json.error);
        }
      } catch (e) {
        console.error("ensure-profile request error", e);
      }

      // 3) Try loading again (in case insert worked)
      const { data: data2, error: error2 } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error2) {
        console.error("Quiz profile reload error", error2);
      }

      setProfile((data2 as Profile) ?? null);
    };

    loadProfile();
  }, [user, supabase]);

  const fullName =
    (profile?.first_name?.trim() || "") +
    (profile?.last_name ? ` ${profile.last_name.trim()}` : "");

  const fallbackName = (() => {
    if (!user?.email) return "there";
    const local = user.email.split("@")[0] || "";
    const cleaned = local.replace(/[._-]+/g, " ");
    const parts = cleaned
      .split(" ")
      .filter(Boolean)
      .map(
        (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
      );
    return parts.length > 0 ? parts.join(" ") : "there";
  })();

  const displayName =
    fullName.trim().length > 0 ? fullName.trim() : fallbackName;

  // ------- Load progress from Supabase + local in-progress flags -------
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoadingProgress(true);

      try {
        // 1) Base structure per domain
        const base: Record<DomainLetter, DomainProgress> = {} as any;
        DOMAIN_ORDER.forEach((d) => {
          base[d] = makeEmptyDomainProgress(d);
        });

        // 2) Supabase rows (source of truth for completion & accuracy)
        const { data, error } = await supabase
          .from("quiz_subdomain_progress")
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          console.error("quiz_subdomain_progress error", error);
        } else {
          const rows = (data ?? []) as ProgressRow[];

          rows.forEach((row) => {
            const domainLetter = row.domain.toUpperCase() as DomainLetter;
            if (!DOMAIN_COUNTS[domainLetter]) return;

            const domProg = base[domainLetter];
            const code = row.subdomain; // "A01", etc.

            const sub = domProg.subdomains.find((s) => s.code === code);
            if (!sub) return;

            if (row.best_accuracy_percent != null) {
              sub.done = true;
              sub.bestAccuracy = row.best_accuracy_percent;
            }
          });
        }

        // 3) Overlay *local in-progress only* (quiz:live)
        //    We NO LONGER use local "done"/"accuracy" keys so that resets
        //    in Supabase fully control completion/accuracy.
        if (typeof window !== "undefined") {
          try {
            DOMAIN_ORDER.forEach((d) => {
              const dom = base[d];

              dom.subdomains.forEach((sub) => {
                const liveKey = `quiz:live:${d}:${sub.code}`;
                const liveRaw = window.localStorage.getItem(liveKey);

                if (liveRaw) {
                  try {
                    const parsed = JSON.parse(liveRaw);
                    if (
                      typeof parsed?.answeredCount === "number" &&
                      parsed.answeredCount > 0
                    ) {
                      sub.hasLive = true;
                      sub.lastUpdated =
                        typeof parsed.lastUpdated === "number"
                          ? parsed.lastUpdated
                          : null;
                    }
                  } catch {
                    // ignore bad JSON
                  }
                }
              });
            });
          } catch {
            // localStorage blocked, ignore
          }
        }

        // 4) Recompute per-domain stats after Supabase + in-progress overlay
        recomputeDomainStats(base);

        const finalProgress = DOMAIN_ORDER.map((d) => base[d]);
        setProgress(finalProgress);
      } finally {
        setLoadingProgress(false);
      }
    };

    load();
  }, [user, supabase]);

  const handleOpenDomain = (domain: DomainLetter) => {
    router.push(`/quiz/${domain}`);
  };

  const handleOpenSubdomain = (_domain: DomainLetter, code: string) => {
    router.push({
      pathname: "/quiz/runner",
      query: { code },
    });
  };

  // ------- Overall stats from merged progress -------

  const totalSubdomains = DOMAIN_ORDER.reduce(
    (sum, d) => sum + DOMAIN_COUNTS[d],
    0
  );
  const totalCompleted = progress.reduce(
    (sum, dom) => sum + dom.completedCount,
    0
  );

  const allAcc: number[] = [];
  progress.forEach((dom) =>
    dom.subdomains.forEach((s) => {
      if (s.done && s.bestAccuracy != null) allAcc.push(s.bestAccuracy);
    })
  );
  const overallAvgAccuracy =
    allAcc.length > 0
      ? allAcc.reduce((a, b) => a + b, 0) / allAcc.length
      : null;

  // Last in-progress quiz from local "live" info
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
        <h1 className="text-4xl font-bold tracking-tight text-blue-900">
          BCBA Quiz Suite
        </h1>
        <p className="text-lg text-slate-700">
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
                    ? `${Math.round(
                        (totalCompleted / totalSubdomains) * 100
                      )}%`
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
            {overallAvgAccuracy != null
              ? `${overallAvgAccuracy.toFixed(0)}%`
              : "—"}
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
            <p className="text-xs font-semibold uppercase text-gray-500">
              Continue
            </p>
            {hasAnyInProgress ? (
              <>
                <p className="mt-2 text-sm font-semibold">
                  Resume your last quiz
                </p>
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
                <p className="mt-2 text-sm font-semibold">
                  No quiz in progress
                </p>
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
              router.push({
                pathname: "/quiz/runner",
                query: { code: lastActiveCode },
              })
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

      {/* Domain Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {progress.map((dom) => {
          const totalSubs = DOMAIN_COUNTS[dom.domain];
          const done = dom.completedCount;
          const percentDone =
            totalSubs > 0 ? Math.round((done / totalSubs) * 100) : 0;
          const accuracy = dom.avgBestAccuracy ?? 0;

          const hasAnyLive = dom.subdomains.some(
            (s) => s.hasLive && !s.done
          );
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

      {loadingProgress && (
        <p className="text-xs text-gray-500 mt-2">
          Loading quiz progress from server…
        </p>
      )}
    </main>
  );
}

