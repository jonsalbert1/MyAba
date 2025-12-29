// pages/admin/quiz/print.tsx
import Head from "next/head";
import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
// ✅ NOTE: do NOT import supabaseAdmin in a pages/ file

type QuizRow = {
  id: string;
  domain: string;
  subdomain: string;
  subdomain_text: string | null;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct_answer: string | null;
  rationale_correct: string | null;
  ordinal: number | null;
  image_path: string | null;
};

type Props = {
  rows: QuizRow[];
  adminEmail: string | null;
};

export default function AdminQuizPrint({ rows }: Props) {
  const [domain, setDomain] = useState<string>("ALL");
  const [includeAnswers, setIncludeAnswers] = useState<boolean>(false);
  const [pageBreakBySubdomain, setPageBreakBySubdomain] =
    useState<boolean>(true);
  const [query, setQuery] = useState<string>(""); // on-screen review search

  const filtered = useMemo(() => {
    let r = rows;

    if (domain !== "ALL") r = r.filter((x) => x.domain === domain);

    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter((x) => {
        const hay = [
          x.domain,
          x.subdomain,
          x.subdomain_text ?? "",
          x.question ?? "",
          x.a ?? "",
          x.b ?? "",
          x.c ?? "",
          x.d ?? "",
          x.correct_answer ?? "",
          x.rationale_correct ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return r;
  }, [rows, domain, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, QuizRow[]>>();

    for (const row of filtered) {
      const d = row.domain ?? "UNK";
      const s = row.subdomain ?? "UNK";

      if (!map.has(d)) map.set(d, new Map());
      const sub = map.get(d)!;

      if (!sub.has(s)) sub.set(s, []);
      sub.get(s)!.push(row);
    }

    const domains = Array.from(map.keys()).sort();

    return domains.map((d) => {
      const sub = map.get(d)!;
      const subs = Array.from(sub.keys()).sort();
      return {
        domain: d,
        subdomains: subs.map((s) => {
          const items = sub.get(s)!;
          items.sort((a, b) => {
            const ao = a.ordinal ?? 0;
            const bo = b.ordinal ?? 0;
            if (ao !== bo) return ao - bo;
            return String(a.id).localeCompare(String(b.id));
          });
          const subdomainText =
            items.find((x) => x.subdomain_text)?.subdomain_text ?? null;

          return { subdomain: s, subdomainText, items };
        }),
      };
    });
  }, [filtered]);

  const totalCount = filtered.length;

  return (
    <>
      <Head>
        <title>Admin Quiz Print</title>
      </Head>

      <div className="no-print controls">
        <div className="row">
          <div className="brand">Admin • Quiz Print</div>

          <label>
            Domain:&nbsp;
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="ALL">All</option>
              {["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="chk">
            <input
              type="checkbox"
              checked={includeAnswers}
              onChange={(e) => setIncludeAnswers(e.target.checked)}
            />
            &nbsp;Include answers + rationales
          </label>

          <label className="chk">
            <input
              type="checkbox"
              checked={pageBreakBySubdomain}
              onChange={(e) => setPageBreakBySubdomain(e.target.checked)}
            />
            &nbsp;Page break by subdomain (print)
          </label>

          <button className="btn" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>

        <div className="row">
          <input
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (question, answer, rationale, subdomain text)…"
          />
          <div className="meta">{totalCount} questions shown</div>
        </div>

        <p className="hint">
          Printing tip: Chrome → Print → More settings → <b>Pages per sheet: 4</b>{" "}
          → Margins: <b>None/Minimum</b> → Scale: <b>Fit</b>.
        </p>
      </div>

      <div className="root">
        {grouped.map(({ domain, subdomains }) => (
          <section key={domain} className="domain">
            <h1 className="domainTitle">Domain {domain}</h1>

            {subdomains.map(({ subdomain, subdomainText, items }) => (
              <div
                key={`${domain}-${subdomain}`}
                className={`subdomain ${pageBreakBySubdomain ? "pb" : ""}`}
              >
                <h2 className="subdomainTitle">
                  {subdomain}{" "}
                  {subdomainText ? <span>— {subdomainText}</span> : null}
                  <span className="count">({items.length})</span>
                </h2>

                <ol className="qList">
                  {items.map((q) => (
                    <li key={q.id} className="q">
                      <div className="qText">{q.question}</div>

                      <div className="choices">
                        <div>
                          <b>A.</b> {q.a}
                        </div>
                        <div>
                          <b>B.</b> {q.b}
                        </div>
                        <div>
                          <b>C.</b> {q.c}
                        </div>
                        <div>
                          <b>D.</b> {q.d}
                        </div>
                      </div>

                      {includeAnswers && (
                        <div className="answer">
                          <div>
                            <b>Correct:</b> {q.correct_answer ?? ""}
                          </div>
                          {q.rationale_correct ? (
                            <div>
                              <b>Rationale:</b> {q.rationale_correct}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        ))}
      </div>

      <style jsx>{`
        .controls {
          position: sticky;
          top: 0;
          z-index: 20;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 10px 12px;
        }
        .row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .brand {
          font-weight: 700;
          margin-right: 10px;
        }
        .chk {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn {
          border: 1px solid #111827;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 14px;
        }
        .search {
          flex: 1;
          min-width: 260px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
        }
        .meta {
          color: #374151;
          font-size: 14px;
        }
        .hint {
          margin: 8px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .root {
          padding: 10px 12px;
        }
        .domainTitle {
          font-size: 16px;
          margin: 12px 0 6px;
        }
        .subdomainTitle {
          font-size: 12px;
          margin: 10px 0 6px;
          color: #111827;
        }
        .subdomainTitle span {
          font-weight: 400;
        }
        .count {
          margin-left: 8px;
          color: #6b7280;
          font-weight: 400;
        }

        .qList {
          margin: 0;
          padding-left: 18px;
        }
        .q {
          margin: 0 0 8px;
          break-inside: avoid;
        }
        .qText {
          font-size: 12px;
          margin-bottom: 3px;
        }
        .choices {
          font-size: 11px;
          line-height: 1.25;
        }
        .answer {
          margin-top: 4px;
          font-size: 11px;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .root {
            padding: 0;
          }
          @page {
            margin: 0.4in;
          }
          .domainTitle {
            font-size: 14px;
          }
          .subdomainTitle {
            font-size: 11px;
          }
          .qText {
            font-size: 10px;
          }
          .choices,
          .answer {
            font-size: 9px;
          }
          .pb {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = createPagesServerClient(ctx);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: `/login?redirectedFrom=${encodeURIComponent(
          "/admin/quiz/print"
        )}`,
        permanent: false,
      },
    };
  }

  // Admin check from profiles
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr || !profile?.is_admin) {
    return { notFound: true };
  }

  // ✅ Create service-role client ONLY on the server, ONLY inside GSSP
  const url =
    (process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceKey) {
    console.error("[admin print] Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
    return { props: { rows: [], adminEmail: user.email ?? null } };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "myaba-admin" },
    },
  });

  // Fetch ALL questions using service role (avoids RLS headaches)
  const { data: rows, error } = await supabaseAdmin
    .from("quiz_questions_v2")
    .select(
      "id,domain,subdomain,subdomain_text,question,a,b,c,d,correct_answer,rationale_correct,ordinal,image_path"
    )
    .order("domain", { ascending: true })
    .order("subdomain", { ascending: true })
    .order("ordinal", { ascending: true });

  if (error) {
    console.error("Admin print fetch error:", error);
    return { props: { rows: [], adminEmail: user.email ?? null } };
  }

  return {
    props: { rows: (rows as QuizRow[]) ?? [], adminEmail: user.email ?? null },
  };
};
