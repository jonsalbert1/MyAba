// pages/quiz/[domain].tsx
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { getDomainTitle, getSubdomainText } from "@/lib/tco";

type ProgressRow = {
  domain: string;
  subdomain: string; // may be "A01" or "A1"
  best_accuracy_percent: number | null;
};

type SubRow = {
  code: string; // "A01"
  title: string;
  done: boolean;
  bestAccuracy: number | null;
  hasLive: boolean;
  lastUpdated: number | null;
};

const DOMAIN_COUNTS: Record<string, number> = {
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

// Normalize "A1" -> "A01", "b9" -> "B09"
function normalizeSubCode(raw: string): string {
  if (!raw) return raw;
  const m = raw.match(/^([A-Ia-i])(\d{1,2})$/);
  if (!m) return raw.toUpperCase();
  const letter = m[1].toUpperCase();
  const num = m[2].padStart(2, "0");
  return `${letter}${num}`;
}

export default function DomainPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const domainParam =
    (router.query.domain as string | undefined)?.toUpperCase() ?? "";
  const domain = domainParam || "";

  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const totalSubs = DOMAIN_COUNTS[domain] ?? 0;
  const domainTitle = domain
    ? getDomainTitle(domain) ?? `Domain ${domain}`
    : "";

  // Build base rows for that domain
  const buildBaseRows = (): SubRow[] => {
    const count = DOMAIN_COUNTS[domain] ?? 0;
    const list: SubRow[] = [];
    for (let i = 1; i <= count; i++) {
      const code = `${domain}${String(i).padStart(2, "0")}`;
      list.push({
        code,
        title: getSubdomainText(code) ?? code,
        done: false,
        bestAccuracy: null,
        hasLive: false,
        lastUpdated: null,
      });
    }
    return list;
  };

  const loadDomain = async () => {
    if (!user || !domain || !DOMAIN_COUNTS[domain]) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      // 1) Start with base rows
      const base = buildBaseRows();

      // 2) Supabase completion rows for this domain
      const { data, error } = await supabase
        .from("quiz_subdomain_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("domain", domain);

      if (error) {
        console.error("quiz_subdomain_progress domain error", error);
        setMsg(error.message ?? "Error loading domain progress.");
      } else {
        const progressRows = (data ?? []) as ProgressRow[];

        progressRows.forEach((row) => {
          const code = normalizeSubCode(row.subdomain);
          const sub = base.find((s) => s.code === code);
          if (!sub) return;
          if (row.best_accuracy_percent != null) {
            sub.done = true;
            sub.bestAccuracy = row.best_accuracy_percent;
          }
        });
      }

      // 3) Overlay local in-progress state (quiz:live)
      if (typeof window !== "undefined") {
        try {
          base.forEach((sub) => {
            const liveKey = `quiz:live:${domain}:${sub.code}`;
            const raw = window.localStorage.getItem(liveKey);
            if (!raw) return;

            try {
              const parsed = JSON.parse(raw);
              if (
                typeof parsed?.answeredCount === "number" &&
                parsed.answeredCount > 0
              ) {
                sub.hasLive = true;
                sub.lastUpdated =
                  typeof parsed.lastUpdated === "number"
                    ? parsed.lastUpdated
                    : null;
              }
            } catch {
              // ignore bad JSON
            }
          });
        } catch {
          // localStorage blocked
        }
      }

      setRows(base);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, domain]);

  const handleOpenSubdomain = (code: string, fresh: boolean) => {
    const query: Record<string, string> = { code };
    if (fresh) {
      query.fresh = "1";
    }
    router.push({
      pathname: "/quiz/runner",
      query,
    });
  };

  const handleResetDomain = async () => {
    if (!user || !domain) return;

    if (
      !window.confirm(
        `This will clear all saved quiz attempts and best scores for Domain ${domain} on your account. Continue?`
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      // ✅ Use server-side reset (avoids RLS issues)
      const resp = await fetch("/api/quiz/reset-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const body = await resp.json().catch(() => null);

      if (!resp.ok || !body?.ok) {
        console.error("reset-domain failed:", resp.status, resp.statusText, body);
        alert(body?.error || "Reset failed. See console for details.");
        return;
      }

      // 2) Clear localStorage keys for this domain
      if (typeof window !== "undefined") {
        const keysToRemove: string[] = [];
        Object.keys(window.localStorage).forEach((key) => {
          if (
            key.startsWith(`quiz:live:${domain}:`) ||
            key.startsWith(`quiz:done:${domain}:`) ||
            key.startsWith(`quiz:accuracy:${domain}:`)
          ) {
            keysToRemove.push(key);
          }
        });
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      }

      // 3) Reload domain rows
      await loadDomain();
    } finally {
      setResetting(false);
    }
  };

  const completedCount = rows.filter((r) => r.done).length;
  const nextCode = rows.find((r) => !r.done)?.code ?? null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/quiz")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          ← Back to Quiz Home
        </button>

        <button
          type="button"
          onClick={handleResetDomain}
          disabled={resetting}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {resetting ? "Resetting…" : `Reset Domain ${domain}`}
        </button>
      </header>

      {/* Domain header */}
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Domain {domain}: {domainTitle}
        </h1>
        <p className="text-sm text-gray-600">
          {totalSubs} total subdomains · Completed: {completedCount}/{totalSubs}
        </p>
        {nextCode && (
          <p className="text-xs text-gray-500">
            Next unfinished subdomain:{" "}
            <span className="font-semibold">{nextCode}</span> —{" "}
            {getSubdomainText(nextCode)}
          </p>
        )}
      </section>

      {loading && (
        <p className="text-sm text-gray-600">
          {msg ?? "Loading domain progress…"}
        </p>
      )}

      {!loading && msg && <p className="text-sm text-red-600">{msg}</p>}

      {/* Subdomain list */}
      <section className="space-y-3">
        {rows.map((sub) => {
          const statusLabel = sub.hasLive
            ? "In progress"
            : sub.done
            ? "Completed"
            : "Not started yet";

          const bestText =
            sub.bestAccuracy != null ? `${sub.bestAccuracy.toFixed(0)}%` : "—";

          const buttonLabel = sub.hasLive
            ? `Continue ${sub.code}`
            : sub.done
            ? `Retake ${sub.code}`
            : `Start ${sub.code}`;

          const fresh = !sub.hasLive; // if we have live data, continue; otherwise start fresh

          return (
            <div
              key={sub.code}
              className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold">
                  {sub.code} — {sub.title}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {statusLabel} · Best: {bestText}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenSubdomain(sub.code, fresh)}
                className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {buttonLabel}
              </button>
            </div>
          );
        })}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-gray-600">
            No subdomains configured for this domain.
          </p>
        )}
      </section>
    </main>
  );
}
