// pages/admin-quiz.tsx
import { useMemo, useRef, useState } from "react";

/* ---------- Robust CSV decoder (UTF-8/UTF-16/CP1252-safe) ---------- */
async function readCSVFileSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // BOM sniff
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder("utf-16le").decode(bytes.slice(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder("utf-16be").decode(bytes.slice(2));
  }

  // 1) strict UTF-8
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { /* keep trying */ }

  // 2) Windows-1252 (if supported)
  try {
    const w = new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
    const bad = (w.match(/\uFFFD/g) || []).length;
    if (bad < 2) return w;
  } catch { /* continue */ }

  // 3) Latin-1 + CP1252 punctuation map
  let s = new TextDecoder("iso-8859-1").decode(bytes);
  const cp1252Map: Record<string,string> = {
    "\x80":"€","\x82":"‚","\x83":"ƒ","\x84":"„","\x85":"…","\x86":"†","\x87":"‡",
    "\x88":"ˆ","\x89":"‰","\x8A":"Š","\x8B":"‹","\x8C":"Œ","\x8E":"Ž",
    "\x91":"‘","\x92":"’","\x93":"“","\x94":"”","\x95":"•","\x96":"–","\x97":"—",
    "\x98":"˜","\x99":"™","\x9A":"š","\x9B":"›","\x9C":"œ","\x9E":"ž","\x9F":"Ÿ"
  };
  s = s.replace(/[\x80-\x9F]/g, ch => cp1252Map[ch] ?? ch);

  // Common mojibake repairs
  s = s
    .replace(/â€“/g, "–").replace(/â€”/g, "—")
    .replace(/â€˜/g, "‘").replace(/â€™/g, "’")
    .replace(/â€œ/g, "“").replace(/â€/g, "”")
    .replace(/â€¢/g, "•").replace(/â€¦/g, "…")
    .replace(/Ã©/g, "é");

  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return s.normalize?.("NFC") ?? s;
}

/* ---------- Client-side chunked POST helper (keeps payloads small on Vercel) ---------- */
async function postChunks<T>(url: string, rows: T[], chunkSize = 300) {
  let insertedTotal = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || `Upload failed at chunk ${i / chunkSize}`);
    insertedTotal += Number(j.inserted || 0);
  }
  return insertedTotal;
}

/* ---------- Types ---------- */
type Row = {
  domain: string;
  subdomain?: string | null;   // can be blank
  a: string;
  b: string;
  c: string;
  d: string;
  correct: string;             // A/B/C/D
  rationale?: string | null;
};

export default function AdminQuiz() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // --- CSV parser (quotes/commas/newlines) ---
  function splitCSVLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === `"`) {
          if (line[i + 1] === `"`) { cur += `"`; i++; } else { inQ = false; }
        } else cur += ch;
      } else {
        if (ch === `"`) inQ = true;
        else if (ch === ",") { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function parseCSV(text: string): Row[] {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n").filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const header = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const idx = {
      domain: header.findIndex(h => h === "domain"),
      subdomain: header.findIndex(h => h === "subdomain"),
      a: header.findIndex(h => h === "a"),
      b: header.findIndex(h => h === "b"),
      c: header.findIndex(h => h === "c"),
      d: header.findIndex(h => h === "d"),
      correct: header.findIndex(h => h === "correct"),
      rationale: header.findIndex(h => h === "rationale" || h === "explanation"),
    };
    if (idx.domain < 0 || idx.a < 0 || idx.b < 0 || idx.c < 0 || idx.d < 0 || idx.correct < 0) {
      throw new Error("CSV must include headers: domain,subdomain,a,b,c,d,correct,rationale");
    }

    const out: Row[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const domain = (cols[idx.domain] ?? "").trim();
      const subdomain = idx.subdomain >= 0 ? (cols[idx.subdomain] ?? "").trim() : "";
      const a = (cols[idx.a] ?? "").trim();
      const b = (cols[idx.b] ?? "").trim();
      const c = (cols[idx.c] ?? "").trim();
      const d = (cols[idx.d] ?? "").trim();
      const correct = (cols[idx.correct] ?? "").trim().toUpperCase();
      const rationale = idx.rationale >= 0 ? (cols[idx.rationale] ?? "").trim() : "";

      if (!domain || !a || !b || !c || !d) continue;
      if (!["A", "B", "C", "D"].includes(correct)) continue;

      out.push({
        domain,
        subdomain: subdomain || null,
        a, b, c, d,
        correct,
        rationale: rationale || null,
      });
    }
    return out;
  }

  async function handleSelectedFile(f: File) {
    setFile(f);
    setStatus(null);
    setError(null);
    setRows([]);
    try {
      if (f.size > 50 * 1024 * 1024) throw new Error("File too large (max 50 MB).");
      const text = await readCSVFileSmart(f); // <-- use robust decoder
      const parsed = parseCSV(text);
      setRows(parsed);
      if (!parsed.length) setStatus("No valid rows found.");
      else setStatus(`Parsed ${parsed.length} rows. Ready to upload.`);
    } catch (e: any) {
      setError(e?.message || "Failed to parse CSV.");
    }
  }

  // drag & drop
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleSelectedFile(f);
  }

  // upload
  const preview = useMemo(() => rows.slice(0, 10), [rows]);

  async function onUpload() {
    try {
      setBusy(true);
      setStatus(null);
      setError(null);

      if (!rows.length) {
        setStatus("Nothing to upload.");
        return;
      }

      // Chunked client-side upload
      const inserted = await postChunks("/api/quiz-bulk", rows, 300);
      setStatus(`Uploaded ${inserted} rows ✅`);
    } catch (e: any) {
      setError(e?.message || "Bulk insert failed");
    } finally {
      setBusy(false);
    }
  }

  // styles
  const dropBase: React.CSSProperties = { border: "2px dashed #94a3b8", borderRadius: 12, padding: 24, background: "#f8fafc", textAlign: "center", cursor: "pointer", userSelect: "none" };
  const dropActive: React.CSSProperties = { borderColor: "#0ea5e9", background: "#eff6ff" };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI" }}>
      <h1 style={{ marginTop: 0 }}>Admin — Quiz CSV Import</h1>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
        <p style={{ marginTop: 0 }}>
          Upload a <b>.csv</b> with headers: <code>domain,subdomain,a,b,c,d,correct,rationale</code>.<br />
          • <b>correct</b> must be one of <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>.<br />
          • <b>subdomain</b> can be blank for now.
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{ ...dropBase, ...(dragOver ? dropActive : {}) }}
          title="Drop CSV here or click to browse"
        >
          <div style={{ fontSize: 16, marginBottom: 6 }}>
            {file ? <>Selected: <b>{file.name}</b> ({Math.round(file.size / 1024)} KB)</> : "Drop CSV here"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>or <span style={{ textDecoration: "underline" }}>click to browse</span></div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleSelectedFile(f);
            }}
            style={{ display: "none" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, alignItems: "start", marginTop: 14 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {status && <div style={{ color: "#065f46", marginBottom: 8 }}>{status}</div>}
            {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <button
              onClick={onUpload}
              disabled={busy || rows.length === 0}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff" }}
            >
              {busy ? "Uploading…" : "Upload to Supabase"}
            </button>
            <a href="/flashcards" style={{ textDecoration: "underline", fontSize: 14 }}>View Flashcards →</a>
          </div>
        </div>

        {/* Preview */}
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          {preview.length > 0 && (
            <>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Preview (first 10 rows)</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["domain","subdomain","a","b","c","d","correct","rationale"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.domain}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.subdomain ?? ""}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.a}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.b}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.c}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.d}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.correct}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.rationale ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
