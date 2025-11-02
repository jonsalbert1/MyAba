// pages/quiz/index.tsx
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

/** Keep in sync with runner */
const COUNTS: Record<string, number> = { A:5, B:24, C:12, D:9, E:12, F:8, G:19, H:8, I:7 };
type DomainLetter = keyof typeof COUNTS;

function listCodes(d: DomainLetter) {
  const n = COUNTS[d];
  return Array.from({ length: n }, (_, i) => `${d}${i + 1}`);
}

type DomainProgress = {
  doneCount: number;
  total: number;
  avgAccuracy: number | null; // 0–100 or null
  lastCode: string | null;     // e.g., "B13"
};
type SubProgress = { done: boolean; accuracy: number | null };

function readDomainProgress(d: DomainLetter): DomainProgress {
  const codes = listCodes(d);
  let doneCount = 0;
  let sum = 0;
  let seen = 0;

  let lastCode: string | null = null;
  try {
    const last = localStorage.getItem(`quiz:lastCode:${d}`);
    lastCode = last && last.startsWith(d) ? last : null;
  } catch {
    lastCode = null;
  }

  for (const c of codes) {
    try {
      const done = localStorage.getItem(`quiz:done:${d}:${c}`) === "1";
      const accRaw = localStorage.getItem(`quiz:accuracy:${d}:${c}`);
      const acc = accRaw ? Number(accRaw) : NaN;
      if (done) doneCount += 1;
      if (!Number.isNaN(acc)) {
        sum += acc;
        seen += 1;
      }
    } catch {
      // ignore storage errors
    }
  }

  return {
    doneCount,
    total: codes.length,
    avgAccuracy: seen ? Math.round(sum / seen) : null,
    lastCode,
  };
}

function readSubdomainProgress(d: DomainLetter): Record<string, SubProgress> {
  const out: Record<string, SubProgress> = {};
  for (const c of listCodes(d)) {
    try {
      const done = localStorage.getItem(`quiz:done:${d}:${c}`) === "1";
      const accRaw = localStorage.getItem(`quiz:accuracy:${d}:${c}`);
      const acc = accRaw ? Number(accRaw) : NaN;
      out[c] = { done, accuracy: Number.isNaN(acc) ? null : acc };
    } catch {
      out[c] = { done: false, accuracy: null };
    }
  }
  return out;
}

export default function QuizTOCAllInOne() {
  const domains = useMemo(() => Object.keys(COUNTS) as DomainLetter[], []);
  const [domainProg, setDomainProg] = useState<Record<DomainLetter, DomainProgress>>({} as any);
  const [subProg, setSubProg] = useState<Record<DomainLetter, Record<string, SubProgress>>>({} as any);

  // Initial read + live updates when other pages write progress
  useEffect(() => {
    const load = () => {
      const nextDomain: Record<DomainLetter, DomainProgress> = {} as any;
      const nextSub: Record<DomainLetter, Record<string, SubProgress>> = {} as any;
      for (const d of domains) {
        nextDomain[d] = readDomainProgress(d);
        nextSub[d] = readSubdomainProgress(d);
      }
      setDomainProg(nextDomain);
      setSubProg(nextSub);
    };
    load();

    const onBcast = () => load();
    window.addEventListener("quiz-progress-updated", onBcast as EventListener);
    return () => window.removeEventListener("quiz-progress-updated", onBcast as EventListener);
  }, [domains]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Study Quiz · All Domains</h1>
          <p className="mt-1 text-sm text-gray-600">
            Scroll to any domain and jump straight into a subdomain. Your progress updates live.
          </p>
        </div>
        <a href="/" className="text-sm underline underline-offset-2 hover:opacity-80">
          ← Back to Home
        </a>
      </header>

      <section className="space-y-8">
        {domains.map((d) => {
          const title = getDomainTitle(d);
          const { doneCount, total, avgAccuracy, lastCode } = domainProg[d] ?? {
            doneCount: 0,
            total: COUNTS[d],
            avgAccuracy: null,
            lastCode: null,
          };
          const pct = Math.round((doneCount / total) * 100);
          const startCode = `${d}1`;
          const resumeHref = lastCode
            ? `/quiz/runner?code=${encodeURIComponent(lastCode)}`
            : `/quiz/runner?code=${encodeURIComponent(startCode)}`;
          const resumeLabel = lastCode ? `Resume ${lastCode}` : `Start ${startCode}`;
          const codes = listCodes(d);

          return (
            <div key={d} className="rounded-xl border p-4 shadow-sm">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Domain {d}</div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-base font-semibold">{title}</h2>
                <div className="flex gap-2">
                  <Link
                    href={resumeHref}
                    className="inline-flex items-center rounded-md border bg-black px-3 py-1.5 text-sm text-white hover:opacity-90"
                    title={resumeLabel}
                  >
                    {resumeLabel}
                  </Link>
                </div>
              </div>

              {/* Domain progress */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                  <span>Completed {doneCount} / {total}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                  <div className="h-2 rounded bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Avg accuracy: <strong>{avgAccuracy != null ? `${avgAccuracy}%` : "—"}</strong>
                </div>
              </div>

              {/* Subdomains inline */}
              <div className="mt-4 space-y-2">
                {codes.map((code) => {
                  const text = getSubdomainText(code);
                  const p = subProg[d]?.[code];
                  const tag =
                    p?.done ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Done{p.accuracy != null ? ` • ${p.accuracy}%` : ""}
                      </span>
                    ) : p?.accuracy != null ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{p.accuracy}%</span>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Not started</span>
                    );

                  return (
                    <Link
                      key={code}
                      href={`/quiz/runner?code=${encodeURIComponent(code)}`}
                      className="block rounded-lg border p-3 hover:bg-gray-50"
                      title={`Open ${code} in the Runner`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-sm font-medium">Subdomain {code}</div>
                        {tag}
                      </div>
                      <div className="text-sm opacity-80">{text}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
