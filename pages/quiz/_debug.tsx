import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function QuizDebug() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setSessionEmail(session?.user?.email ?? null);

      try {
        const head = await supabase
          .from("quiz_questions")
          .select("*", { count: "exact", head: true })
          .throwOnError();
        if (!cancelled) setCount(head.count ?? 0);

        const { data } = await supabase
          .from("quiz_questions")
          .select("*")
          .limit(1)
          .throwOnError();

        if (!cancelled) setSample(data?.[0] ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-3 text-sm">
      <h1 className="text-xl font-semibold">Quiz Debug</h1>
      <div className="border p-3 rounded bg-white">
        <div>Signed in as: <b>{sessionEmail ?? "— (no session)"}</b></div>
        <div>Total <code>quiz_questions</code>: <b>{count ?? "…"}</b></div>
        {error && <div className="text-red-600">Error: {error}</div>}
      </div>
      <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-auto">
        {JSON.stringify(sample, null, 2)}
      </pre>
      <p className="text-gray-600">If count is null or an error appears, RLS is blocking reads.</p>
    </div>
  );
}
