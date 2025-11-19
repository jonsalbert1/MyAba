// pages/quiz/domain.tsx
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

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

type Row = {
  code: string; // e.g., "A1"
  title: string;
  started: boolean;
  completed: boolean;
  bestAccuracy: number | null;
};

export default function DomainSubdomainsPage() {
  const router = useRouter();
  const user = useUser();

  const domainParam = useMemo(() => {
    const raw = (router.query.domain ?? "").toString().toUpperCase();
    if (!raw) return null;
    if (["A","B","C","D","E","F","G","H","I"].includes(raw)) {
      return raw as DomainLetter;
    }
    return null;
  }, [router.query.domain]);

  const [rows, setRows] = useState<Row[]>([]);

  // Build rows (and hydrate progress) on the client
  useEffect(() => {
    if (!domainParam) return;

    const count = COUNTS[domainParam];
    if (!count) {
      setRows([]);
      return;
    }

    const nextRows: Row[] = [];

    for (let i = 1; i <= count; i++) {
      const code = `${domainParam}${i}`;
      const title = getSubdomainText(code) ?? code;

      let started = false;
      let completed = false;
      let bestAccuracy: number | null = null;

      if (typeof window !== "undefined") {
        const startedKey = `quiz:started:${domainParam}:${code}`;
        const doneKey = `quiz:done:${domainParam}:${code}`;
        const accKey = `quiz:accuracy:${domainParam}:${code}`;

        started = window.localStorage.getItem(startedKey) === "1";
        completed = window.localStorage.getItem(doneKey) === "1";

        const accStr = window.localStorage.getItem(accKey);
        if (accStr != null) {
          const n = Number(accStr);
          if (Number.isFinite(n)) bestAccuracy = n;
        }
      }

      nextRows.push({
        code,
        title,
        started,
        completed,
        bestAccuracy,
      });
    }

    setRows(nextRows);
  }, [domainParam, user]); // rerun when domain or user changes

  const domainTitle = domainParam ? getDomainTitle(domainParam) ?? "" : "";

  if (!domainParam) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/quiz"
          className="mb-4 inline-flex text-sm text-blue-700 hover:underline"
        >
          ← Back to Quiz Home
        </Link>
        <h1 className="text-2xl font-semibold mb-2">Domain not found</h1>
        <p className="text-sm text-gray-600">
          The requested domain is missing or invalid. Please go back and select
          a domain from the quiz home page.
        </p>
      </main>
    );
  }

  function handleOpenSubdomain(code: string) {
    router.push({
      pathname: "/quiz/runner",
      query: { code },
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/quiz"
        className="mb-4 inline-flex text-sm text-blue-700 hover:underline"
      >
        ← Back to Quiz Home
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight mb-1">
        Domain {domainParam} Subdomains
      </h1>
      {domainTitle && (
        <p className="mb-6 text-sm text-gray-600">{domainTitle}</p>
      )}

      <section className="space-y-3">
        {rows.map((row) => {
          let statusText: string;
          if (row.completed) {
            statusText = "Completed";
          } else if (row.started) {
            statusText = "In progress";
          } else {
            statusText = "Not started yet";
          }

          const bestText =
            row.bestAccuracy != null ? `${row.bestAccuracy}%` : "—";

          const buttonLabel = row.completed
            ? `Retake ${row.code}`
            : row.started
            ? `Continue ${row.code}`
            : `Start ${row.code}`;

          return (
            <div
              key={row.code}
              className="flex items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {row.code} – {row.title}
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  {statusText} · Best: {bestText}
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenSubdomain(row.code)}
                  className="rounded-md bg-black px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
