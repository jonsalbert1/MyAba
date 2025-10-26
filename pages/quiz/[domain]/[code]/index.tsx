// pages/quiz/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type QRow = { id: string; domain: string; subdomain: string };
type RRow = { question_id: string; domain: string; subdomain: string; correct: boolean };

const DOMAIN_LABELS: Record<string, string> = {
  A: "Behaviorism & Philosophical Foundations",
  B: "Concepts & Principles",
  C: "Measurement, Data Display, & Interpretation",
  D: "Experimental Design",
  E: "Ethical & Professional Issues",
  F: "Behavior Assessment",
  G: "Behavior-Change Procedures",
  H: "Selecting & Implementing Interventions",
  I: "Personnel Supervision & Management",
};

export default function QuizHome() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [results, setResults] = useState<RRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Get user id
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      // 2) Get all quiz questions (domain/subdomain)
      const { data: qData, error: qErr } = await supabase
        .from("quiz_questions")
        .select("id, domain, subdomain");
      if (qErr) {
        console.error("quiz_questions error:", qErr);
        setLoading(false);
        return;
      }

      setQuestions((qData ?? []) as QRow[]);

      // 3) Get this user's results (attempted/missed)
      let rData: RRow[] = [];
      if (user?.id) {
        const { data, error } = await supabase
          .from("quiz_results")
          .select("question_id, domain, subdomain, correct")
          .eq("user_id", user.id);
        if (error) console.error("quiz_results error:", error);
        rData = (data ?? []) as RRow[];
      }
      setResults(rData);
      setLoading(false);
    })();
  }, []);

  // --- Build aggregates ---
  const byDomain = useMemo(() => {
    const map = new Map<string, { totalQ: number; attempted: number; correct: number; subdomains: Map<string, { totalQ: number; attempted: number; correct: number }> }>();

    for (const q of questions) {
      if (!map.has(q.domain)) map.set(q.domain, { totalQ: 0, attempted: 0, correct: 0, subdomains: new Map() });
      const d = map.get(q.domain)!;
      d.totalQ += 1;

      if (!d.subdomains.has(q.subdomain)) d.subdomains.set(q.subdomain, { totalQ: 0, attempted: 0, correct: 0 });
      const s = d.subdomains.get(q.subdomain)!;
      s.totalQ += 1;
    }

    // Attempted/correct
    const seenByQuestion = new Set<string>(); // in case results have dup attempts, count distinct question_id for attempted
    for (const r of results) {
      // count attempt per distinct question
      const key = r.question_id;
      const domainBucket = map.get(r.domain);
      if (!domainBucket) continue;

      const subBucket = domainBucket.subdomains.get(r.subdomain);
      if (!subBucket) continue;

      if (!seenByQuestion.has(key)) {
        seenByQuestion.add(key);
        domainBucket.attempted += 1;
        subBucket.attempted += 1;
      }
      if (r.correct) {
        domainBucket.correct += 1;
        subBucket.correct += 1;
      }
    }

    return map;
  }, [questions, results]);

  function pct(a: number, b: number) {
    if (!b) return 0;
    return Math.round((a / b) * 100);
  }

  // pick next subdomain to resume = lowest completion % (attempted/totalQ), tie-break by natural order (A1, A2, ...)
  function nextSubdomainFor(domain: string) {
    const d = byDomain.get(domain);
    if (!d) return null;
    const entries = Array.from(d.subdomains.entries())
      .sort((a, b) => {
        // completion %
        const ca = a[1].totalQ ? a[1].attempted / a[1].totalQ : 0;
        const cb = b[1].totalQ ? b[1].attempted / b[1].totalQ : 0;
        if (ca !== cb) return ca - cb;
        // tie-break lexicographically (A1 < A2, etc.)
        return a[0].localeCompare(b[0], undefined, { numeric: true });
      });
    return entries[0]?.[0] ?? null;
  }

  const domainCards = Object.keys(DOMAIN_LABELS).map((dom) => {
    const d = byDomain.get(dom);
    const totalQ = d?.totalQ ?? 0;
    const attempted = d?.attempted ?? 0;
    const percent = pct(attempted, totalQ);
    const resume = nextSubdomainFor(dom);

    return (
      <div key={dom} className="rounded-2xl border p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{dom}. {DOMAIN_LABELS[dom]}</div>
          <div className="text-sm rounded-full border px-2 py-0.5">{percent}% complete</div>
        </div>
        <div className="text-sm text-gray-600">
          {attempted} of {totalQ} questions attempted
        </div>
        <div className="mt-auto flex gap-3">
          {resume ? (
            <Link className="underline" href={`/quiz/${dom}/${resume}`}>
              Resume: {resume}
            </Link>
          ) : (
            <span className="text-gray-500">No questions loaded yet</span>
          )}
          <Link className="underline ml-auto" href={`/quiz/${dom}`}>
            View domain TOC
          </Link>
        </div>
      </div>
    );
  });

  return (
    <main className="mx-auto max-w-6xl py-6">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Quiz Home</h1>
      <p className="mt-2 text-gray-700">
        Welcome! This app is divided into <strong>9 domains</strong> from the <strong>6th Edition BCBA Task List</strong>.
        Pick a domain to continue where you left off, or jump into the full set/random/missed quizzes below.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border bg-gray-100" />
          ))
        ) : (
          domainCards
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">More ways to study</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/quiz/toc" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Entire Set of Quizzes (TOC)
          </Link>
          <Link href="/quiz/random" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Random Quiz
          </Link>
          <Link href="/quiz/missed" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Missed Quizzes
          </Link>
        </div>
      </section>
    </main>
  );
}
