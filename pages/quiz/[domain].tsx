// pages/quiz/[domain].tsx
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

type ProgressRow = {
  domain: string;
  subdomain: string;
  best_accuracy_percent: number | null;
};

export default function DomainPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const domain = (router.query.domain as string | undefined)?.toUpperCase() ?? "";
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Domain counts for layout
  const DOMAIN_COUNTS: Record<string, number> = {
    A: 5, B: 24, C: 12, D: 9, E: 12,
    F: 8, G: 19, H: 8, I: 7,
  };

  const subCount = DOMAIN_COUNTS[domain] ?? 0;

  useEffect(() => {
    if (!router.isReady || !user || !domain) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("quiz_subdomain_progress")
          .select("*")
          .eq("domain", domain)
          .eq("user_id", user.id);

        if (error) {
          setMsg(error.message);
          setLoading(false);
          return;
        }

        setRows((data as any[]) ?? []);
        setMsg(null);
        setLoading(false);
      } catch (e: any) {
        setMsg(e?.message ?? "Unexpected error");
        setLoading(false);
      }
    };

    load();
  }, [router.isReady, user, domain, supabase]);

  const handleStart = (subCode: string) => {
    router.push(`/quiz/runner?code=${subCode}&fresh=1`);
  };

  const handleResume = (subCode: string) => {
    router.push(`/quiz/runner?code=${subCode}&resume=1`);
  };

  // Get accuracy from row list
  const getAccuracy = (code: string) => {
    return rows.find((r) => r.subdomain === code)?.best_accuracy_percent ?? null;
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      {/* HEADER */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Domain {domain}: {getDomainTitle(domain)}
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            {subCount} total subdomains
          </p>
        </div>

        <button
          onClick={() => router.push("/quiz")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
        >
          ← Back to Full TOC
        </button>
      </header>

      {/* LOADING + ERROR */}
      {loading && (
        <p className="text-sm text-zinc-600">Loading domain progress…</p>
      )}

      {!loading && msg && (
        <p className="text-sm text-red-600">{msg}</p>
      )}

      {!loading && !msg && (
        <section className="space-y-4">
          {/* GRID OF SUBDOMAINS */}
          {Array.from({ length: subCount }).map((_, i) => {
            const num = i + 1;
            const subCode = `${domain}${String(num).padStart(2, "0")}`;
            const acc = getAccuracy(subCode);

            // 🔑 Use the full code only, and guard the dash
            const label = getSubdomainText(subCode) ?? "";

            return (
              <div
                key={subCode}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-sm">
                      {subCode}
                      {label && (
                        <>
                          {" — "}
                          {label}
                        </>
                      )}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      {acc !== null ? (
                        <>
                          Best Accuracy: <strong>{acc}%</strong>
                        </>
                      ) : (
                        <>No attempts yet</>
                      )}
                    </p>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col gap-1">
                    {acc !== null ? (
                      <>
                        <button
                          onClick={() => handleResume(subCode)}
                          className="rounded-md bg-blue-600 text-white text-xs px-3 py-1 hover:bg-blue-700"
                        >
                          Continue
                        </button>
                        <button
                          onClick={() => handleStart(subCode)}
                          className="rounded-md border border-zinc-300 text-xs px-3 py-1 hover:bg-zinc-50"
                        >
                          Retake
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStart(subCode)}
                        className="rounded-md bg-green-600 text-white text-xs px-3 py-1 hover:bg-green-700"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>

                {/* mini progress bar */}
                {acc !== null && (
                  <div className="mt-3 h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${acc}%` }}
                    ></div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
