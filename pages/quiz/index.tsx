// pages/quiz/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import Link from "next/link";
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
};

function makeDefaultStats(letter: DomainLetter): DomainStats {
  const totalSubdomains = COUNTS[letter];
  return {
    letter,
    title: getDomainTitle(letter) ?? "",
    totalSubdomains,
    completedSubdomains: 0,
    bestAccuracy: null,
  };
}

export default function QuizHomePage() {
  const user = useUser();
  const router = useRouter();

  const [stats, setStats] = useState<Record<DomainLetter, DomainStats>>(() => {
    const init: Partial<Record<DomainLetter, DomainStats>> = {};
    (Object.keys(COUNTS) as DomainLetter[]).forEach((L) => {
      init[L] = makeDefaultStats(L);
    });
    return init as Record<DomainLetter, DomainStats>;
  });

  // Hydrate from localStorage on the client (ONLY when signed in)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return; // no progress when logged out

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

      updated[L] = {
        letter: L,
        title: base.title,
        totalSubdomains,
        completedSubdomains: completed,
        bestAccuracy: bestAcc,
      };
    });

    setStats((prev) => ({ ...prev, ...(updated as any) }));
  }, [user]);

  const domains = useMemo(
    () => (Object.keys(COUNTS) as DomainLetter[]).map((L) => stats[L]),
    [stats]
  );

  // Overall progress (only meaningful if logged in)
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

  /** ⬇️ Route to /quiz/domain?domain=A etc */
  function handleDomainClick(letter: DomainLetter) {
    router.push({
      pathname: "/quiz/domain",
      query: { domain: letter },
    });
  }

  const isSignedIn = !!user;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header / hero */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-blue-900">
          myABA.app Quiz Home
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Work through BCBA® Task List Domains A–I with scenario-based
          questions. Progress is tracked per subdomain when you&apos;re signed
          in.
        </p>

        {!isSignedIn && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-md border bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign in to start
            </Link>
            <p className="text-xs text-gray-500">
              You can browse domains and subdomains while signed out, but you
              must sign in to take quizzes and save progress.
            </p>
          </div>
        )}
      </header>

      {/* Overall progress */}
      <section className="mb-6 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-medium">Overall domains progress</span>{" "}
            {isSignedIn ? (
              <span className="text-gray-600">
                · Completed{" "}
                <strong>{overall.completedSubdomains}</strong> /{" "}
                {overall.totalSubdomains} subdomains
              </span>
            ) : (
              <span className="text-gray-600">
                · Sign in to track progress across subdomains.
              </span>
            )}
          </div>
          {isSignedIn && (
            <div className="text-xs text-gray-500">
              {overall.percent}% complete
            </div>
          )}
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
          <div
            className={`h-2 rounded transition-all ${
              isSignedIn ? "bg-blue-500" : "bg-gray-300"
            }`}
            style={{
              width: isSignedIn ? `${overall.percent}%` : "0%",
            }}
          />
        </div>
      </section>

      {/* Domains grid */}
      <section className="grid gap-4 md:grid-cols-3">
        {(Object.keys(COUNTS) as DomainLetter[]).map((L) => {
          const d = stats[L];
          const completionPct = d.totalSubdomains
            ? Math.round((d.completedSubdomains / d.totalSubdomains) * 100)
            : 0;

          return (
            <button
              key={d.letter}
              type="button"
              onClick={() => handleDomainClick(d.letter)}
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
                {isSignedIn && (
                  <div className="text-right text-[11px] text-gray-500">
                    <div>
                      {d.completedSubdomains} / {d.totalSubdomains} done
                    </div>
                    <div>
                      Best:{" "}
                      {d.bestAccuracy != null ? `${d.bestAccuracy}%` : "—"}
                    </div>
                  </div>
                )}
              </div>

              {/* Per-domain progress bar */}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className={`h-1.5 rounded transition-all ${
                    isSignedIn ? "bg-green-500" : "bg-gray-300"
                  }`}
                  style={{
                    width: isSignedIn ? `${completionPct}%` : "0%",
                  }}
                />
              </div>

              <div className="mt-3 text-xs text-gray-600">
                <span className="font-medium">Tap to view subdomains</span>
                <span className="block text-[11px] text-gray-400">
                  You&apos;ll see A1–A{COUNTS.A}, B1–B{COUNTS.B}, etc. on the
                  next screen.
                </span>
              </div>
            </button>
          );
        })}
      </section>
    </main>
  );
}
