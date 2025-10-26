import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = { code: string; title: string; lastScore?: number | null; starred?: boolean };

const NAME: Record<string,string> = {
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

export default function SectionPage() {
  const router = useRouter();
  const { isReady, query } = router;

  // 🛡️ Do not derive domain until router is ready
  const domain = isReady ? String(query.domain ?? "").toUpperCase() : "";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !domain) return;

    (async () => {
      setLoading(true);

      // Load subdomains from quiz_questions using the correct column: subdomain
      const { data: subs } = await supabase
        .from("quiz_questions")
        .select("subdomain, subdomain_text")
        .ilike("subdomain", `${domain}%`)
        .order("subdomain");

      let codes = Array.from(
        new Set((subs ?? []).map((r: any) => r.subdomain as string).filter(Boolean))
      );

      // Optional fallback so A shows links even if DB empty
      if (domain === "A" && codes.length === 0) codes = ["A1","A2","A3","A4","A5"];

      const mapTitle = new Map<string, string>();
      (subs ?? []).forEach((r: any) => {
        if (r.subdomain) mapTitle.set(r.subdomain, r.subdomain_text ?? "");
      });

      // Last attempts (try modern 'subdomain', fallback to legacy 'subdomain_code')
      const lastScore = new Map<string, number>();
      if (codes.length) {
        let attempts = await supabase
          .from("quiz_attempts")
          .select("subdomain, score, created_at")
          .in("subdomain", codes)
          .order("created_at", { ascending: false });

        if (attempts.error) {
          attempts = await supabase
            .from("quiz_attempts")
            .select("subdomain_code, score, created_at")
            .in("subdomain_code", codes)
            .order("created_at", { ascending: false });
        }

        (attempts.data ?? []).forEach((a: any) => {
          const key = (a.subdomain ?? a.subdomain_code) as string;
          if (key && !lastScore.has(key)) lastScore.set(key, a.score);
        });
      }

      // Stars (try 'subdomain', fallback to 'subdomain_code')
      let starSet = new Set<string>();
      if (codes.length) {
        let stars = await supabase.from("quiz_stars").select("subdomain").in("subdomain", codes);
        if (stars.error) {
          stars = await supabase.from("quiz_stars").select("subdomain_code").in("subdomain_code", codes);
        }
        starSet = new Set(
          (stars.data ?? []).map((s: any) => (s.subdomain ?? s.subdomain_code) as string)
        );
      }

      setRows(
        codes.map(code => ({
          code,
          title: mapTitle.get(code) ?? "",
          lastScore: lastScore.get(code) ?? null,
          starred: starSet.has(code),
        }))
      );

      setLoading(false);
    })();
  }, [isReady, domain]);

  // 🛡️ Avoid SSR/CSR mismatch: render a stable shell until router is ready
  if (!isReady) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  // Guard unknown domain AFTER router is ready
  if (!NAME[domain]) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-gray-600">Unknown section.</p>
        <Link href="/course" className="text-blue-700 underline">← Back to Course</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/course" className="text-blue-700 hover:underline">← Course</Link>

      <h1 className="mt-3 text-3xl font-semibold">Section {domain}</h1>
      <p className="text-gray-600">{NAME[domain]}</p>

      <h2 className="mt-8 text-2xl font-semibold">Quizzes</h2>

      {loading ? (
        <p className="mt-4 text-gray-600">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-gray-600">No quizzes yet for this section.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border bg-white">
          {rows.map((r) => (
            <li key={r.code} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <Link href={`/quiz/${r.code[0]}/${r.code}`} className="flex-1">
                <div className="font-medium">
                  {r.code}. {r.title || "(content coming soon)"}
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <StarButton code={r.code} initial={r.starred ?? false} />
                <ScoreBadge score={r.lastScore} />
                <Link href={`/quiz/${r.code[0]}/${r.code}`} className="text-gray-400">›</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 text-sm">—</span>;
  const color = score >= 9 ? "bg-green-500" : score >= 7 ? "bg-blue-600" : "bg-gray-700";
  return <span className={`px-2 py-1 rounded-lg ${color} text-white text-sm`}>{score}/10</span>;
}

function StarButton({ code, initial }: { code: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button
      aria-label={on ? "Unstar" : "Star"}
      onClick={async () => {
        setOn(v => !v);
        // Prefer modern 'subdomain', fallback to legacy 'subdomain_code'
        let res = await supabase.from("quiz_stars").upsert({ subdomain: code });
        if (res.error) {
          await supabase.from("quiz_stars").upsert({ subdomain_code: code });
        }
      }}
      className={`w-7 h-7 rounded-full border flex items-center justify-center ${on ? "text-yellow-500 border-yellow-500" : "text-gray-400"}`}
      title={on ? "Starred" : "Star"}
    >
      ★
    </button>
  );
}
