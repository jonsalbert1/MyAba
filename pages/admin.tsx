// pages/admin.tsx
import { useState } from "react";
import Head from "next/head";

type Row = { term: string; def: string };

export default function AdminPage() {
  const [csv, setCsv] = useState<string>(
    "term,def\nSD,Discriminative Stimulus\nMO,Motivating Operation"
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const parseCsv = (text: string): Row[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const ti = header.indexOf("term");
    const di = header.indexOf("def");
    if (ti < 0 || di < 0) throw new Error('Header must include "term,def"');

    return lines
      .slice(1)
      .map(line => {
        const cols = line.split(",").map(c => c.trim());
        return { term: cols[ti] ?? "", def: cols[di] ?? "" };
      })
      .filter(r => r.term && r.def);
  };

  const upload = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload = parseCsv(csv);
      if (!payload.length) throw new Error("No rows to insert");

      const res = await fetch("/api/aba/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Insert failed");
      setMsg(\Inserted \ rows ✅\);
    } catch (e: any) {
      setMsg(\Error: \\);
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/aba/flashcards");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Fetch failed");
      const n = Array.isArray(j.data) ? j.data.length : 0;
      setMsg(\Deck has \ cards\);
    } catch (e: any) {
      setMsg(\Error: \\);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>myABA | Admin</title></Head>
      <main className="min-h-screen px-6 py-8">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-2">Admin – Flashcards Uploader</h1>
        <p className="text-gray-600 mb-4">
          Paste CSV with headers <b>term,def</b>. Rows go to the deck set by <code>GLOBAL_DECK_ID</code>.
        </p>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          className="w-full h-64 p-3 rounded-2xl border border-gray-200 bg-white shadow-sm"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={upload}
            disabled={busy}
            className="bg-blue-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload CSV"}
          </button>
          <button
            onClick={preview}
            disabled={busy}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-black/90 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Preview Deck Size"}
          </button>
        </div>

        {msg && <div className="mt-3">{msg}</div>}
      </main>
    </>
  );
}
