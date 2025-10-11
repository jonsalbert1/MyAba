// pages/admin.tsx
import { useState } from "react";
import Head from "next/head";

export default function AdminPage() {
  const [csv, setCsv] = useState<string>("term,def\nSD,Discriminative Stimulus\nMO,Motivating Operation");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Simple CSV -> array of {term, def}
  const parseCsv = (text: string) => {
    const rows = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(",").map((c) => c.trim()));

    if (rows.length < 2) return [];

    const header = rows[0].map((h) => h.toLowerCase());
    const ti = header.indexOf("term");
    const di = header.indexOf("def");
    if (ti < 0 || di < 0) throw new Error('Header must include "term,def"');

    return rows
      .slice(1)
      .map((r) => ({ term: r[ti], def: r[di] }))
      .filter((r) => r.term && r.def);
  };

  const upload = async () => {
    setBusy(true);
    setMessage(null);
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

      setMessage(`Inserted ${payload.length} rows ✅`);
    } catch (e: any) {
      setMessage(`Error: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/aba/flashcards");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Fetch failed");
      setMessage(`Deck has ${Array.isArray(j.data) ? j.data.length : 0} cards`);
    } catch (e: any) {
      setMessage(`Error: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>myABA | Admin</title></Head>
      <main style={{ minHeight: "100vh", padding: 24, background: "#f7f7fb" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f3d87", marginBottom: 12 }}>Admin – Flashcards Uploader</h1>
        <p style={{ color: "#6b7280", marginBottom: 8 }}>
          Paste CSV with headers <b>term,def</b>. Rows will be inserted into the deck set by <code>GLOBAL_DECK_ID</code>.
        </p>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          style={{ width: "100%", height: 240, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            onClick={upload}
            disabled={busy}
            style={{ background: "#0f3d87", color: "white", padding: "10px 16px", borderRadius: 12, border: "none", fontWeight: 600 }}
          >
            {busy ? "Uploading…" : "Upload CSV"}
          </button>
          <button
            onClick={preview}
            disabled={busy}
            style={{ background: "#111827", color: "white", padding: "10px 16px", borderRadius: 12, border: "none", fontWeight: 600 }}
          >
            {busy ? "Checking…" : "Preview Deck Size"}
          </button>
        </div>

        {message && <div style={{ marginTop: 12 }}>{message}</div>}
      </main>
    </>
  );
}
