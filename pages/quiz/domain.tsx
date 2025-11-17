// pages/quiz/domain.tsx
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@supabase/auth-helpers-react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

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

type SubdomainStats = {
  code: string; // e.g., "A3"
  label: string; // e.g., "A3 – Identify goals…"
  completed: boolean;
  bestAccuracy: number | null;
};

export default function DomainPage() {
  const user = useUser();
  const router = useRouter();
  const { domain: rawDomain } = router.query;

  const domain = useMemo(() => {
    if (!rawDomain) return null;
    const s = Array.isArray(rawDomain) ? rawDomain[0] : rawDomain;
    const letter = s.toUpperCase() as DomainLetter;
    return DOMAIN_COUNTS[letter] ? letter : null;
  }, [rawDomain]);

  const [subs, setSubs] = useState<SubdomainStats[]>([]);

  // Build base subdomain list
  useEffect(() => {
    if (!domain) return;
    const max = DOMAIN_COUNTS[domain];
    const base: SubdomainStats[] = [];
    for (let i = 1; i <= max; i++) {
      const code = `${domain}${i}`;
      const label = getSubdomainText(code) ?? code;
      base.push({
        code,
        label,
        completed: false,
        bestAccuracy: null,
      });
    }
    setSubs(base);
  }, [domain]);

  // Hydrate from localStorage ONLY when signed in
  useEffect(() => {
    if (!domain) return;
    if (typeof window === "undefined") return;
    if (!user) return;

    setSubs((prev) =>
      prev.map((sd) => {
        const doneKey = `quiz:done:${domain}:${sd.code}`;
        const accKey = `quiz:accuracy:${domain}:${sd.code}`;

        const done = window.localStorage.getItem(doneKey) === "1";

        const accStr = window.localStorage.getItem(accKey);
        let best: number | null = null;
        if (accStr != null) {
          const val = Number(accStr);
          if (Number.isFinite(val)) best = val;
        }

        return {
          ...sd,
          completed: done,
          bestAccuracy: best,
        };
      })
    );
  }, [domain, user]);

  if (!domain) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Domain</h1>
        <p className="text-sm text-gray-600 mb-3">
          Invalid or missing domain in URL.
        </p>
        <Link
          href="/quiz"
          className="mt-2 inline-flex rounded-md border px-4 py-2 text-sm"
        >
          ← Back to Quiz Home
        </Link>
      </main>
    );
  }

  const domainTitle = getDomainTitle(domain);
  const isSignedIn = !!user;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/quiz"
          className="mb-2 inline-flex text-sm text-blue-700 underline-offset-2 hover:underline"
        >
          ← Back to Quiz Home
        </Link>

        <h1 className="text-2xl font-semibold mb-1">
          Domain {domain} Subdomains
        </h1>
        {domainTitle && (
          <p className="text-sm text-gray-700">{domainTitle}</p>
        )}

        {!isSignedIn && (
          <p className="mt-2 text-xs text-gray-600">
            You can browse subdomains while signed out, but you must sign in to
            start quizzes or track progress.
          </p>
        )}
      </header>

      <section className="space-y-3">
        {subs.map((sd) => (
          <div
            key={sd.code}
            className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm shadow-sm"
          >
            <div>
              <div className="font-semibold">
                {sd.code} – {sd.label}
              </div>
              {isSignedIn && (
                <div className="mt-1 text-xs text-gray-500">
                  {sd.completed ? "Completed" : "Not completed yet"} · Best:{" "}
                  {sd.bestAccuracy != null ? `${sd.bestAccuracy}%` : "—"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isSignedIn ? (
                <Link
                  href="/login"
                  className="rounded-md border px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                >
                  Sign in to start
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    router.push({
                      pathname: "/quiz/runner",
                      query: { code: sd.code },
                    })
                  }
                  className="rounded-md border bg-black px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                >
                  Start {sd.code}
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
