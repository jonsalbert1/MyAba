import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** How many subdomains per domain letter */
const COUNTS: Record<string, number> = { A:5,B:24,C:12,D:9,E:12,F:8,G:19,H:8,I:7 };

function getAllDomainLetters() {
  return Object.keys(COUNTS);
}

function readLocal(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function DomainRow({ letter }: { letter: string }) {
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [round, setRound] = useState<number>(0);

  useEffect(() => {
    try {
      const r = Number(readLocal(`quiz:round:${letter}`) || 0);
      setRound(Number.isFinite(r) ? r : 0);
      setLastCode(readLocal(`quiz:lastCode:${letter}`) || null);

      const max = COUNTS[letter] ?? 0;
      const m: Record<string, boolean> = {};
      for (let i = 1; i <= max; i++) {
        const code = `${letter}${i}`;
        m[code] = readLocal(`quiz:done:${letter}:${code}`) === "1";
      }
      setDoneMap(m);
    } catch {/* ignore */}
  }, [letter]);

  const firstCode = `${letter}1`;
  const resumeCode = lastCode && /^[A-I]\d+$/i.test(lastCode) ? lastCode : firstCode;
  const completedCount = Object.values(doneMap).filter(Boolean).length;

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Domain {letter}</div>
          <div className="text-xs text-gray-500">
            This round: {completedCount}/{COUNTS[letter]} completed • Round #{round}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/quiz/runner", query: { code: resumeCode } }}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Resume exactly where you left off in this domain"
          >
            Resume ({resumeCode})
          </Link>
          <Link
            href={{ pathname: "/quiz/runner", query: { code: firstCode } }}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Start over at the first subdomain"
          >
            Start at {firstCode}
          </Link>
          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Clear local progress for this domain and bump round"
            onClick={() => {
              const raw = Number(readLocal(`quiz:round:${letter}`) || 0);
              const nextRound = (Number.isFinite(raw) ? raw : 0) + 1;
              localStorage.setItem(`quiz:round:${letter}`, String(nextRound));

              const max = COUNTS[letter] ?? 0;
              for (let i = 1; i <= max; i++) {
                const code = `${letter}${i}`;
                localStorage.removeItem(`quiz:done:${letter}:${code}`);
                localStorage.removeItem(`quiz:accuracy:${letter}:${code}`);
              }
              localStorage.removeItem(`quiz:lastCode:${letter}`);
              location.reload();
            }}
          >
            Reset round
          </button>
        </div>
      </div>

      {/* Single-column checklist for subdomains */}
      <ul className="mt-3 space-y-1 text-sm">
        {Array.from({ length: COUNTS[letter] }, (_, i) => `${letter}${i + 1}`).map((code) => (
          <li key={code} className="flex items-center gap-2">
            <span
              className={
                "inline-flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] " +
                (doneMap[code] ? "bg-green-500 text-white border-green-500" : "bg-white text-transparent")
              }
              aria-label={doneMap[code] ? "Completed" : "Not completed"}
              title={doneMap[code] ? "Completed" : "Not completed"}
            >
              ✓
            </span>
            <span className="w-12">{code}</span>
            <Link
              href={{ pathname: "/quiz/runner", query: { code } }}
              className="underline underline-offset-2 hover:opacity-80"
              title={`Open ${code}`}
            >
              Open
            </Link>
            <span className="ml-2 text-xs text-gray-500">
              {doneMap[code] ? "Completed" : "—"}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Picks a reasonable global "continue" target by scanning lastCode for each domain. */
function useGlobalResume() {
  const [resume, setResume] = useState<{ letter: string; code: string } | null>(null);
  useEffect(() => {
    try {
      const letters = getAllDomainLetters();
      // Prefer most recent domain that actually has a lastCode; otherwise A1
      const found = letters
        .map((L) => ({ L, last: readLocal(`quiz:lastCode:${L}`) }))
        .find((x) => x.last && /^[A-I]\d+$/i.test(x.last));
      if (found?.last) setResume({ letter: found.L, code: found.last });
      else setResume({ letter: "A", code: "A1" });
    } catch {/* ignore */}
  }, []);
  return resume;
}

export default function QuizHub() {
  const letters = useMemo(() => getAllDomainLetters(), []);
  const resume = useGlobalResume();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Quiz Hub</h1>
          <p className="text-sm text-gray-600">
            One page to resume, start fresh, or browse all subdomains.
          </p>
        </div>
        <nav className="flex gap-2">
          <Link
            href={resume ? { pathname: "/quiz/runner", query: { code: resume.code } } : "/quiz/runner?code=A1"}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Continue where you left off"
          >
            Continue {resume ? `(${resume.code})` : "(A1)"}
          </Link>
          <Link
            href="/"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Back to Home"
          >
            Home
          </Link>
        </nav>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href={{ pathname: "/quiz/runner", query: { code: "A1" } }} className="rounded-lg border p-4 hover:bg-gray-50">
          <div className="text-lg font-semibold">Start at A1</div>
          <div className="text-sm text-gray-600">Begin the A domain from the first subdomain.</div>
        </Link>
        <Link href={{ pathname: "/quiz/runner", query: { code: "B1" } }} className="rounded-lg border p-4 hover:bg-gray-50">
          <div className="text-lg font-semibold">Jump to B1</div>
          <div className="text-sm text-gray-600">Quick link to the next domain.</div>
        </Link>
        <Link href="/quiz/runner?code=I1" className="rounded-lg border p-4 hover:bg-gray-50">
          <div className="text-lg font-semibold">Explore I1</div>
          <div className="text-sm text-gray-600">Try a different domain segment.</div>
        </Link>
      </section>

      {/* Single-column list of domains with subdomain checklist */}
      <ol className="space-y-4">
        {letters.map((L) => (
          <DomainRow key={L} letter={L} />
        ))}
      </ol>
    </main>
  );
}
