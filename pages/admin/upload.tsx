// pages/admin/upload.tsx
import { useMemo, useState } from "react";
import Papa from "papaparse";
import type { GetServerSideProps } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

type Row = {
  subdomain: string;
  subdomain_text: string;
  statement: string;
  question: string;
  a: string; b: string; c: string; d: string;
  correct_answer: string;
  rationale_correct: string;
  rationale_a: string; rationale_b: string; rationale_c: string; rationale_d: string;
  is_active?: string | boolean;
};

const REQUIRED_HEADERS = [
  "subdomain","subdomain_text","statement","question",
  "a","b","c","d","correct_answer",
  "rationale_correct","rationale_a","rationale_b","rationale_c","rationale_d",
  "is_active"
];

export default function AdminUpload() {
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [filename, setFilename] = useState<string>("");

  function normalizeHeader(h: string) {
    // remove BOM, trim, lowercase
    return h.replace(/^\uFEFF/, "").trim().toLowerCase();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setLog("Parsing CSV…");
    setRows([]);
    setHeaders([]);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      transform: (value) => (typeof value === "string" ? value.trim() : value),
      complete: (res) => {
        const parsedHeaders = (res.meta.fields ?? []).map(normalizeHeader);
        setHeaders(parsedHeaders);
        setRows(res.data);
        setLog(`Parsed ${res.data.length} rows from “${file.name}”.`);
      },
      error: (err) => setLog(`Parse error: ${err.message}`),
    });
  }

  const { missing, extras, valid } = useMemo(() => {
    const hset = new Set(headers);
    const missing = REQUIRED_HEADERS.filter((h) => !hset.has(h));
    const extras = headers.filter((h) => !REQUIRED_HEADERS.includes(h));
    const valid = missing.length === 0;
    return { missing, extras, valid };
  }, [headers]);

  async function onUpload() {
    if (!valid) return setLog("Fix headers before uploading.");
    if (rows.length === 0) return setLog("No rows to upload.");
    setLog("Uploading…");
    const resp = await fetch("/api/admin/upload-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const j = await resp.json();
    if (!resp.ok || !j.ok) return setLog(`Error: ${j.error || resp.statusText}`);
    setLog(`✅ Uploaded ${j.upserted} rows.`);
  }

  function resetAll() {
    setRows([]); setHeaders([]); setFilename(""); setLog("");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (input) input.value = "";
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin • Upload Quiz CSV</h1>

      <p className="text-gray-600">
        CSV must include headers: {REQUIRED_HEADERS.join(", ")}
      </p>

      <input type="file" accept=".csv" onChange={onFile} className="block" />

      {headers.length > 0 && (
        <div className="rounded border p-3 text-sm">
          <div className="mb-2">
            <strong>File:</strong> {filename || "—"}
          </div>

          <div className="mb-2">
            <strong>Detected headers:</strong> {headers.join(", ") || "—"}
          </div>

          {missing.length > 0 && (
            <p className="text-red-600">
              Missing headers: {missing.join(", ")}
            </p>
          )}
          {extras.length > 0 && (
            <p className="text-amber-600">
              Extra headers (ignored): {extras.join(", ")}
            </p>
          )}
          {missing.length === 0 && (
            <p className="text-green-700">Headers look good ✅</p>
          )}

          <div className="mt-3">
            <strong>Preview (first 3 rows):</strong>
            <pre className="bg-gray-50 rounded p-2 overflow-auto">
              {JSON.stringify(rows.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onUpload}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          disabled={!valid || rows.length === 0}
          title={!valid ? "Fix headers first" : rows.length === 0 ? "No rows parsed" : ""}
        >
          Upload {rows.length ? `(${rows.length})` : ""}
        </button>
        <button onClick={resetAll} className="rounded border px-4 py-2">
          Reset
        </button>
      </div>

      <pre className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">
        {log || "—"}
      </pre>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: "/login", permanent: false } };
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return { notFound: true };
  return { props: {} };
};
