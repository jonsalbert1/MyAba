// pages/quiz/[domain]/index.tsx
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

/** Keep this COUNTS in sync with your runner */
const COUNTS: Record<string, number> = { A:5, B:24, C:12, D:9, E:12, F:8, G:19, H:8, I:7 };

type DomainLetter = keyof typeof COUNTS;

function toDomainLetter(s: string | undefined): DomainLetter | null {
  const L = (s ?? "").toUpperCase();
  return (Object.keys(COUNTS) as DomainLetter[]).includes(L as DomainLetter) ? (L as DomainLetter) : null;
}

function listCodes(domain: DomainLetter): string[] {
  const n = COUNTS[domain];
  return Array.from({ length: n }, (_, i) => `${domain}${i + 1}`);
}

type SubProgress = { done: boolean; accuracy: number | null };

export default function DomainOverviewPage() {
  const router = useRouter();
  const domainParam = String(router.query.domain ?? "");
  const domain = toDomainLetter(domainParam);

  const title = useMemo(() => (domain ? getDomainTitle(domain) : ""), [domain]);
  const codes = useMemo(() => (domain ? listCodes(domain) : []), [domain]);

  const [lastCode, setLastCode] = useState<string | null>(null);
  const [prog, setProg] = useState<Record<string, SubProgress>>({});

  // Read progress from localStorage on mount or when domain changes
  useEffect(() => {
    if (!domain) return;

    try {
      const last = localStorage.getItem(`quiz:lastCode:${domain}`);
      setLastCode(last && last.startsWith(domain) ? last : null);

      const nextProg: Record<string, SubProgress> = {};
      for (const c of listCodes(domain)) {
        const done = localStorage.getItem(`quiz:done:${domain}:${c}`) === "1";
        const accRaw = localStorage.getItem(`quiz:accuracy:${domain}:${c}`);
        const accuracy = accRaw ? Number(accRaw) : null;
        nextProg[c] = { done, accuracy: Number.isFinite(accuracy) ? accuracy : null };
      }
      setProg(nextProg);
    } catch {
      setLastCode(null);
      setProg({});
    }

    // live updates from other tabs/pages
    const onBcast = () => {
      try {
        const last = localStorage.getItem(`quiz:lastCode:${domain}`);
        setLastCode(last && last.startsWith(domain) ? last : null);
        const nextProg: Record<string, SubProgress> = {};
        for (const c of listCodes(domain)) {
          const done = localStorage.getItem(`quiz:done:${domain}:${c}`) === "1";
          const accRaw = localStorage.getItem(`quiz:accuracy:${domain}:${c}`);
          const accuracy = accRaw ? Number(accRaw) : null;
          nextProg[c] = { done, accuracy: Number.isFinite(accuracy) ? accuracy : null };
        }
        setProg(nextProg);
      } catch {}
    };
    window.addEventListener("quiz-progress-updated", onBcast as EventListener);
    return () => window.removeEventListener("quiz-progress-updated", onBcast as EventListener);
  }, [domain]);

  if (!domain) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Quiz</h1>
        <p className="mt-2 text-gray-700">Unknown domain.</p>
        <p className="mt-2">
          <a href="/quiz" className="underline">← Back to TOC</a>
        </p>
      </main>
    );
  }

  const startCode = `${domain}1`;
  const ctaHref = lastCode ? `/quiz/runner?code=${encodeURIComponent(lastCode)}` : `/quiz/runner?code=${startCode}`;
  const ctaLabel = lastCode ? `Resume ${lastCode}` : `Start ${startCode}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Domain {domain} · {title}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Select a subdomain to begin or resume your quiz for this domain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/quiz" className="text-sm underline underline-offset-2 hover:opacity-80">← Back to TOC</a>
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-md border bg-black px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            {ctaLabel}
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {codes.map((code) => {
          const text = getSubdomainText(code);
          const p = prog[code];
          const tag =
            p?.done ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Done{p.accuracy != null ? ` • ${p.accuracy}%` : ""}</span>
            ) : p?.accuracy != null ? (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{p.accuracy}%</span>
            ) : (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Not started</span>
            );

          return (
            <Link
              key={code}
              href={`/quiz/runner?code=${encodeURIComponent(code)}`}
              className="block rounded-xl border p-3 shadow-sm transition hover:shadow"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm font-semibold">Subdomain {code}</div>
                {tag}
              </div>
              <div className="text-sm opacity-80">{text}</div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
