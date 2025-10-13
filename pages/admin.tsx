// pages/admin.tsx
import { useMemo, useRef, useState } from "react";

/* ---------- Robust CSV decoder (UTF-8/UTF-16/CP1252-safe) ---------- */
async function readCSVFileSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
async function postChunks<T>(url: string, rows: T[], chunkSize = 350) {
  let insertedTotal = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || `Upload failed at chunk ${i/chunkSize}`);
    insertedTotal += Number(j.inserted || 0);
  }
  return insertedTotal;
}

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

  // 3) Latin-1 decode + map CP1252 punctuation
  let s = new TextDecoder("iso-8859-1").decode(bytes);
  const cp1252Map: Record<string, string> = {
    "\x80": "€", "\x82": "‚", "\x83": "ƒ", "\x84": "„", "\x85": "…", "\x86": "†", "\x87": "‡",
    "\x88": "ˆ", "\x89": "‰", "\x8A": "Š", "\x8B": "‹", "\x8C": "Œ", "\x8E": "Ž",
    "\x91": "‘", "\x92": "’", "\x93": "“", "\x94": "”", "\x95": "•", "\x96": "–", "\x97": "—",
    "\x98": "˜", "\x99": "™", "\x9A": "š", "\x9B": "›", "\x9C": "œ", "\x9E": "ž", "\x9F": "Ÿ"
  };
  s = s.replace(/[\x80-\x9F]/g, ch => cp1252Map[ch] ?? ch);

  // 4) Common mojibake repairs
  s = s
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€˜/g, "‘")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€¢/g, "•")
    .replace(/â€¦/g, "…")
    .replace(/Ã©/g, "é");

  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return s.normalize?.("NFC") ?? s;
}

/* ---------- shared CSV helpers ---------- */
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === `"`) { if (line[i + 1] === `"`) { cur += `"`; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === `"`) inQ = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
const normalizeNewlines = (t: string) => t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

/* ---------- Flashcards tab ---------- */
type CardRow = { term: string; definition: string; domain?: string | null; deck?: string | null };

function useFlashcardsUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CardRow[]>([]);
  const [defaultDeck, setDefaultDeck] = useState("GLOBAL");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function parseCSV(text: string): CardRow[] {
    const lines = normalizeNewlines(text).split("\n").filter(l => l.trim());
    if (!lines.length) return [];
    const header = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const idx = {
      term: header.findIndex(h => h === "term"),
      definition: header.findIndex(h => h === "definition"),
      domain: header.findIndex(h => h === "domain"),
      deck: header.findIndex(h => h === "deck"),
    };
    if (idx.term < 0 || idx.definition < 0) throw new Error("CSV must include headers: term,definition[,domain,deck]");
    const out: CardRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const term = (cols[idx.term] ?? "").trim();
      const definition = (cols[idx.definition] ?? "").trim();
      const domain = idx.domain >= 0 ? (cols[idx.domain] ?? "").trim() : "";
      const deck = idx.deck >= 0 ? (cols[idx.deck] ?? "").trim() : "";
      if (!term || !definition) continue;
      out.push({ term, definition, domain: domain || null, deck: deck || null });
    }
    return out;
  }

  async function handleSelectedFile(f: File) {
    setFile(f); setStatus(null); setError(null); setRows([]);
    try {
      if (f.size > 50 * 1024 * 1024) throw new Error("File too large (max 50 MB).");
      const text = await readCSVFileSmart(f);
      const parsed = parseCSV(text);
      setRows(parsed);
      setStatus(parsed.length ? `Parsed ${parsed.length} rows. Ready to upload.` : "No valid rows found.");
    } catch (e: any) { setError(e?.message || "Failed to parse CSV."); }
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void handleSelectedFile(f); }

  const preview = useMemo(() => rows.slice(0, 10), [rows]);

  async function upload() {
    try {
      setBusy(true); setStatus(null); setError(null);
      const ready = rows.map(r => ({ term: r.term, definition: r.definition, domain: r.domain ?? null, deck: r.deck ?? defaultDeck || "GLOBAL" }));
      if (!ready.length) { setStatus("Nothing to upload."); return; }
      const resp = await fetch("/api/flashcards-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ready) });
      const j = await resp.json();
      if (!j.ok) throw new Error(j.error || "Bulk insert failed");
      setStatus(`Uploaded ${j.inserted} rows ✅`);
    } catch (e: any) { setError(e?.message || "Bulk insert failed"); }
    finally { setBusy(false); }
  }

  return { state: { file, rows, defaultDeck, status, error, busy, dragOver }, setDefaultDeck, inputRef, handleSelectedFile, onDragOver, onDragLeave, onDrop, upload, preview };
}

/* ---------- Quiz tab ---------- */
type QuizRow = {
  domain: string;
  subdomain?: string | null;
  question: string;
  a: string; b: string; c: string; d: string;
  correct: string;             // A/B/C/D
  rationale?: string | null;
};

function useQuizUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function parseCSV(text: string): QuizRow[] {
    const lines = normalizeNewlines(text).split("\n").filter(l => l.trim());
    if (!lines.length) return [];
    const header = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const idx = {
      domain: header.findIndex(h => h === "domain"),
      subdomain: header.findIndex(h => h === "subdomain"),
      question: header.findIndex(h => h === "question" || h === "prompt"),
      a: header.findIndex(h => h === "a"),
      b: header.findIndex(h => h === "b"),
      c: header.findIndex(h => h === "c"),
      d: header.findIndex(h => h === "d"),
      correct: header.findIndex(h => h === "correct"),
      rationale: header.findIndex(h => h === "rationale" || h === "explanation"),
    };
    if (idx.domain < 0 || idx.question < 0 || idx.a < 0 || idx.b < 0 || idx.c < 0 || idx.d < 0 || idx.correct < 0)
      throw new Error("CSV must include headers: domain,subdomain,question,a,b,c,d,correct,rationale");
    const out: QuizRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const domain = (cols[idx.domain] ?? "").trim();
      const subdomain = idx.subdomain >= 0 ? (cols[idx.subdomain] ?? "").trim() : "";
      const question = (cols[idx.question] ?? "").trim();
      const a = (cols[idx.a] ?? "").trim();
      const b = (cols[idx.b] ?? "").trim();
      const c = (cols[idx.c] ?? "").trim();
      const d = (cols[idx.d] ?? "").trim();
      const correct = (cols[idx.correct] ?? "").trim().toUpperCase();
      const rationale = idx.rationale >= 0 ? (cols[idx.rationale] ?? "").trim() : "";
      if (!domain || !question || !a || !b || !c || !d) continue;
      if (!["A", "B", "C", "D"].includes(correct)) continue;
      out.push({ domain, subdomain: subdomain || null, question, a, b, c, d, correct, rationale: rationale || null });
    }
    return out;
  }

  async function handleSelectedFile(f: File) {
    setFile(f); setStatus(null); setError(null); setRows([]);
    try {
      if (f.size > 50 * 1024 * 1024) throw new Error("File too large (max 50 MB).");
      const text = await readCSVFileSmart(f);
      const parsed = parseCSV(text);
      setRows(parsed);
      setStatus(parsed.length ? `Parsed ${parsed.length} rows. Ready to upload.` : "No valid rows found.");
    } catch (e: any) { setError(e?.message || "Failed to parse CSV."); }
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void handleSelectedFile(f); }

  const preview = useMemo(() => rows.slice(0, 10), [rows]);

  async function upload() {
    try {
      setBusy(true); setStatus(null); setError(null);
      if (!rows.length) { setStatus("Nothing to upload."); return; }
      const resp = await fetch("/api/quiz-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows) });
      const j = await resp.json();
      if (!j.ok) throw new Error(j.error || "Bulk insert failed");
      setStatus(`Uploaded ${j.inserted} rows ✅`);
    } catch (e: any) { setError(e?.message || "Bulk insert failed"); }
    finally { setBusy(false); }
  }

  return { state: { file, rows, status, error, busy, dragOver }, inputRef, handleSelectedFile, onDragOver, onDragLeave, onDrop, upload, preview };
}

/* ---------- Page with tabs ---------- */
export default function Admin() {
  const [tab, setTab] = useState<"cards" | "quiz">("cards");
  const cards = useFlashcardsUploader();
  const quiz = useQuizUploader();

  return (
    <div className="page">
      <h1 className="mb-4 text-2xl font-semibold">Admin</h1>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setTab("cards")}
          className={`rounded-lg border px-3 py-2 ${tab === "cards" ? "border-sky-500 bg-sky-500 text-white" : "border-slate-200 bg-white text-slate-900"}`}
        >
          Flashcards CSV
        </button>
        <button
          onClick={() => setTab("quiz")}
          className={`rounded-lg border px-3 py-2 ${tab === "quiz" ? "border-sky-500 bg-sky-500 text-white" : "border-slate-200 bg-white text-slate-900"}`}
        >
          Quiz CSV
        </button>
        <div className="ml-auto" />
        <a href="/flashcards" className="underline">View Flashcards →</a>
      </div>

      {tab === "cards" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3">
            CSV headers: <code>term,definition,domain,deck</code>. Only <b>term</b> and <b>definition</b> are required.
          </p>

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => cards.inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && cards.inputRef.current?.click()}
            onDragOver={cards.onDragOver} onDragLeave={cards.onDragLeave} onDrop={cards.onDrop}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center ${cards.state.dragOver ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-slate-50"}`}
            title="Drop CSV here or click to browse"
          >
            <div className="mb-1 text-base">
              {cards.state.file
                ? <>Selected: <b>{cards.state.file.name}</b> ({Math.round(cards.state.file.size / 1024)} KB)</>
                : "Drop CSV here"}
            </div>
            <div className="text-sm opacity-80">or <span className="underline">click to browse</span></div>
            <input
              ref={cards.inputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void cards.handleSelectedFile(f); }}
            />
          </div>

          {/* Options + Upload */}
          <div className="mt-3 grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <div className="text-sm opacity-85">
              {cards.state.status && <div className="mb-2 text-emerald-700">{cards.state.status}</div>}
              {cards.state.error && <div className="mb-2 text-red-700">{cards.state.error}</div>}
            </div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm">Default deck (used if CSV deck is blank):</label>
                <input
                  value={cards.state.defaultDeck}
                  onChange={(e) => cards.setDefaultDeck(e.target.value)}
                  placeholder="GLOBAL"
                  className="w-full rounded-lg border border-slate-200 p-2"
                />
              </div>
              <button
                onClick={cards.upload}
                disabled={cards.state.busy || cards.state.rows.length === 0}
                className="rounded-xl border border-sky-500 bg-sky-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cards.state.busy ? "Uploading…" : "Upload to Supabase"}
              </button>
            </div>
          </div>

          {/* Preview */}
          {!!cards.preview.length && (
            <div className="table-wrap mt-4">
              <div className="mb-1 text-sm opacity-70">Preview (first 10 rows)</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["term","definition","domain","deck"].map(h => (
                      <th key={h} className="border-b border-slate-200 bg-slate-50 p-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cards.preview.map((r, i) => (
                    <tr key={i}>
                      <td className="border-b border-slate-100 p-2">{r.term}</td>
                      <td className="border-b border-slate-100 p-2">{r.definition}</td>
                      <td className="border-b border-slate-100 p-2">{r.domain ?? ""}</td>
                      <td className="border-b border-slate-100 p-2">{r.deck ?? cards.state.defaultDeck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3">
            CSV headers: <code>domain,subdomain,question,a,b,c,d,correct,rationale</code>.
            <br />• <b>correct</b> must be A/B/C/D. • <b>subdomain</b> can be blank.
          </p>

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => quiz.inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && quiz.inputRef.current?.click()}
            onDragOver={quiz.onDragOver} onDragLeave={quiz.onDragLeave} onDrop={quiz.onDrop}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center ${quiz.state.dragOver ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-slate-50"}`}
            title="Drop CSV here or click to browse"
          >
            <div className="mb-1 text-base">
              {quiz.state.file
                ? <>Selected: <b>{quiz.state.file.name}</b> ({Math.round(quiz.state.file.size / 1024)} KB)</>
                : "Drop CSV here"}
            </div>
            <div className="text-sm opacity-80">or <span className="underline">click to browse</span></div>
            <input
              ref={quiz.inputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void quiz.handleSelectedFile(f); }}
            />
          </div>

          {/* Upload */}
          <div className="mt-3 grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <div className="text-sm opacity-85">
              {quiz.state.status && <div className="mb-2 text-emerald-700">{quiz.state.status}</div>}
              {quiz.state.error && <div className="mb-2 text-red-700">{quiz.state.error}</div>}
            </div>
            <div className="grid gap-3">
              <button
                onClick={quiz.upload}
                disabled={quiz.state.busy || quiz.state.rows.length === 0}
                className="rounded-xl border border-sky-500 bg-sky-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quiz.state.busy ? "Uploading…" : "Upload to Supabase"}
              </button>
            </div>
          </div>

          {/* Preview */}
          {!!quiz.preview.length && (
            <div className="table-wrap mt-4">
              <div className="mb-1 text-sm opacity-70">Preview (first 10 rows)</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["domain","subdomain","question","a","b","c","d","correct","rationale"].map(h => (
                      <th key={h} className="border-b border-slate-200 bg-slate-50 p-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quiz.preview.map((r, i) => (
                    <tr key={i}>
                      <td className="border-b border-slate-100 p-2">{r.domain}</td>
                      <td className="border-b border-slate-100 p-2">{r.subdomain ?? ""}</td>
                      <td className="border-b border-slate-100 p-2">{r.question}</td>
                      <td className="border-b border-slate-100 p-2">{r.a}</td>
                      <td className="border-b border-slate-100 p-2">{r.b}</td>
                      <td className="border-b border-slate-100 p-2">{r.c}</td>
                      <td className="border-b border-slate-100 p-2">{r.d}</td>
                      <td className="border-b border-slate-100 p-2">{r.correct}</td>
                      <td className="border-b border-slate-100 p-2">{r.rationale ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
