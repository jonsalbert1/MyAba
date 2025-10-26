import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DOMAINS: Record<string, string> = {
  A: "Behaviorism and Philosophical Foundations",
  B: "Concepts and Principles",
  C: "Measurement, Data Display, and Interpretation",
  D: "Experimental Design",
  E: "Ethical and Professional Issues",
  F: "Behavior Assessment",
  G: "Behavior-Change Procedures",
  H: "Selecting and Implementing Interventions",
  I: "Personnel Supervision and Management",
};

type Totals = {
  totalQuestions: number;
  answeredQuestions: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalSections: number;
  completedSections: number;
};

export default function CourseIndex() {
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    (async () => {
      // --- Fetch unique subdomains ---
      const { data: subs } = await supabase
        .from("quiz_questions")
        .select("subdomain")
        .neq("subdomain", null)
        .order("subdomain");

      const allSubs = Array.from(
        new Set((subs ?? []).map((r: any) => r.subdomain as string))
      );

      const byDomain: Record<string, Set<string>> = {};
      allSubs.forEach((code) => {
        const d = code[0];
        byDomain[d] ??= new Set();
        byDomain[d].add(code);
      });

      // --- Completed subdomains ---
      const { data: done } = await supabase
        .from("quiz_attempts")
        .select("subdomain, completed")
        .eq("completed", true);

      const doneSet = new Set(
        (done ?? []).map((r: any) => r.subdomain as string)
      );

      const rem: Record<string, number> = {};
      Object.keys(DOMAINS).forEach((d) => {
        const total = byDomain[d]?.size ?? 0;
        const completed = [...(byDomain[d] ?? new Set())].filter((s) =>
          doneSet.has(s)
        ).length;
        rem[d] = Math.max(0, total - completed);
      });
      setRemaining(rem);

      // --- Totals for progress block ---
      const { data: allQ } = await supabase.from("quiz_questions").select("id");
      const totalQuestions = allQ?.length ?? 0;

      const { data: answersRaw } = await supabase
        .from("quiz_attempt_items")
        .select("id");
      const answeredQuestions = answersRaw?.length ?? 0;

      const completedQuizzes = doneSet.size;
      const totalQuizzes = allSubs.length;

      let completedSections = 0;
      for (const d of Object.keys(DOMAINS)) {
        const subsForD = byDomain[d] ?? new Set();
        if ([...subsForD].length > 0 && [...subsForD].every((s) => doneSet.has(s))) {
          completedSections++;
        }
      }

      setTotals({
        totalQuestions,
        answeredQuestions,
        totalQuizzes,
        completedQuizzes,
        totalSections: Object.keys(DOMAINS).length,
        completedSections,
      });
    })();
  }, []);

  const pct = totals
    ? Math.round(
        (totals.answeredQuestions / Math.max(1, totals.totalQuestions)) * 100
      )
    : 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* 📊 Stats Block */}
      {totals && (
        <section className="mb-8 rounded-2xl bg-blue-900 text-white p-6 shadow-lg">
          <div className="text-sm opacity-90 mb-2">Your Quiz Progress</div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold">{pct}%</div>
            <div className="text-lg opacity-90">Complete</div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 md:grid-cols-6">
            <Counter
              label="Questions"
              value={totals.answeredQuestions}
              of={totals.totalQuestions}
            />
            <Counter
              label="Quizzes"
              value={totals.completedQuizzes}
              of={totals.totalQuizzes}
            />
            <Counter
              label="Sections"
              value={totals.completedSections}
              of={totals.totalSections}
            />
          </div>

          <div className="mt-6 h-3 rounded-full bg-white/30">
            <div
              className="h-3 rounded-full bg-white"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      {/* 📚 Domain List */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Course</h1>
        <span className="rounded-full bg-blue-100 text-blue-800 text-sm px-3 py-1">
          Chapters Remaining
        </span>
      </div>

      <ul className="mt-6 space-y-3">
        {Object.entries(DOMAINS).map(([code, name]) => (
          <li
            key={code}
            className="bg-white rounded-xl border p-4 hover:bg-gray-50 transition"
          >
            <Link
              href={`/course/${code}`}
              className="flex items-center justify-between"
            >
              <div className="text-lg font-medium">
                <span className="mr-2">{code}.</span>
                {name}
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full bg-blue-900 text-white w-8 h-8 text-sm">
                  {remaining[code] ?? 0}
                </span>
                <span className="text-gray-400">›</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Counter({
  label,
  value,
  of,
}: {
  label: string;
  value: number;
  of: number;
}) {
  return (
    <div className="rounded-xl bg-white/10 p-4 text-center">
      <div className="text-sm opacity-90">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      <div className="opacity-90 text-sm">of {of}</div>
    </div>
  );
}
