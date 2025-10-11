// pages/upload.tsx
import { useState } from "react";
import Head from "next/head";

type Row = { term: string; def: string };

export default function UploadPage() {
  const [json, setJson] = useState<string>(
    JSON.stringify(
      [
        { term: "SD", def: "Discriminative Stimulus" },
        { term: "MO", def: "Motivating Operation" }
      ],
      null,
      2
    )
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Choose which API you want to hit:
  //  - "/api/cards/bulk-upsert" (your existing endpoint for 'cards' table)
  //  - "/api/aba/flashcards" (the deck-based endpoint we added)
  const TARGET_ENDPOINT = "/api/cards/bulk-upsert"; // change to "/api/aba/flashcards" if desired

  const upload = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload: Row[] = JSON.parse(json);
      if (!Array.isArray(payload) || !payload.length) throw new Error("Provide an array of { term, def }");

      const res = await fetch(TARGET_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || j?.error) throw new Error(j?.error || "Upload failed");

      setMsg(`Uploaded ${payload.length} rows ✅`);
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>myABA | Upload</title></Head>
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f3d87" }}>Bulk Upload</h1>
        <p style={{ color: "#6b7280", marginTop: 6, marginBottom: 12 }}>
          Paste JSON array of objects like: <code>[{"{"} "term": "SD", "def": "Discriminative Stimulus" {"}"}]</code>
        </p>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          style={{ width: "100%", height: 260, padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
        />
        <div style={{ marginTop: 12 }}>
          <button
            onClick={upload}
            disabled={busy}
            style={{ background: "#0f3d87", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 12, fontWeight: 600 }}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
        {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
      </main>
    </>
  );
}
