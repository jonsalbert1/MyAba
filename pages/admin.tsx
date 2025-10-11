import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Card = { term: string; def: string };
type Quiz = { question: string; a: string; b: string; c: string; d: string; answer: "A"|"B"|"C"|"D"; rationale?: string };

export default function AdminPage() {
  const [tab, setTab] = useState<"cards"|"quiz">("cards");
  const [cards, setCards] = useState<Card[]>([]);
  const [quiz, setQuiz]   = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const ok = Boolean(supabase);

  useEffect(() => {
    if (!ok) return;
    refresh();
  }, [ok]);

  async function refresh() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: cdata, error: cerr } = await supabase.from("flashcards").select("*").order("created_at", { ascending: false }).limit(200);
      if (!cerr && cdata) setCards(cdata as any);

      const { data: qdata, error: qerr } = await supabase.from("quiz_questions").select("*").order("created_at", { ascending: false }).limit(200);
      if (!qerr && qdata) setQuiz(qdata as any);
    } finally {
      setLoading(false);
    }
  }

  // ---- Single add: flashcard ----
  const [term, setTerm] = useState("");
  const [def, setDef] = useState("");
  async function addCard() {
    if (!supabase) return alert("Supabase not configured");
    if (!term || !def) return alert("Please enter term and def");
    const { error } = await supabase.from("flashcards").insert({ term, def });
    if (error) return alert(error.message);
    setTerm(""); setDef("");
    refresh();
  }

  // ---- Single add: quiz ----
  const [q, setQ] = useState("");
  const [A, setA] = useState(""); const [B, setB] = useState(""); const [C, setC] = useState(""); const [D, setD] = useState("");
  const [ans, setAns] = useState<"A"|"B"|"C"|"D">("A");
  const [why, setWhy] = useState("");
  async function addQuiz() {
    if (!supabase) return alert("Supabase not configured");
    if (!q || !A || !B || !C || !D) return alert("Fill question and all four options");
    const { error } = await supabase.from("quiz_questions").insert({
      question: q, a: A, b: B, c: C, d: D, answer: ans, rationale: why
    });
    if (error) return alert(error.message);
    setQ(""); setA(""); setB(""); setC(""); setD(""); setWhy("");
    refresh();
  }

  // ---- Bulk upload CSV parsers (simple) ----
  function parseSimpleCSV(text: string) {
    return text.split(/\r?\n/).filter(Boolean).map(line => line.split(","));
  }

  async function uploadCardsCSV(file: File) {
    if (!supabase) return alert("Supabase not configured");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = String(e.target?.result ?? "");
      const rows = parseSimpleCSV(text);
      if (rows.length < 2) return alert("No rows found");
      const header = rows[0].map(s => s.trim().toLowerCase());
      const ti = header.indexOf("term"), di = header.indexOf("def");
      if (ti < 0 || di < 0) return alert("Header must include term,def");
      const payload = rows.slice(1).map(r => ({ term: r[ti], def: r[di] })).filter(r => r.term && r.def);
      const { error } = await supabase.from("flashcards").insert(payload);
      if (error) return alert(error.message);
      refresh();
    };
    reader.readAsText(file);
  }

  async function uploadQuizCSV(file: File) {
    if (!supabase) return alert("Supabase not configured");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = String(e.target?.result ?? "");
      const rows = parseSimpleCSV(text);
      if (rows.length < 2) return alert("No rows found");
      const h = rows[0].map(s => s.trim().toLowerCase());
      const qi = h.indexOf("question"), ai = h.indexOf("a"), bi = h.indexOf("b"), ci = h.indexOf("c"), di = h.indexOf("d"), ki = h.indexOf("answer"), ri = h.indexOf("rationale");
      if ([qi,ai,bi,ci,di,ki].some(i=>i<0)) return alert("Header must include question,a,b,c,d,answer (+ rationale optional)");
      const payload = rows.slice(1).map(r => ({
        question: r[qi], a: r[ai], b: r[bi], c: r[ci], d: r[di],
        answer: (r[ki] || "A").toUpperCase(), rationale: ri>=0 ? r[ri] : null
      })).filter(x => x.question && x.a && x.b && x.c && x.d);
      const { error } = await supabase.from("quiz_questions").insert(payload as any);
      if (error) return alert(error.message);
      refresh();
    };
    reader.readAsText(file);
  }

  const page: React.CSSProperties = { minHeight: "100vh", background: "#f7f7f8" };
  const box: React.CSSProperties = { maxWidth: 960, margin: "0 auto", padding: 24 };
  const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 };
  const btn: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#e0e7ff", color: "#1e3a8a", cursor: "pointer" };
  const input: React.CSSProperties = { padding: 8, border: "1px solid #d1d5db", borderRadius: 8 };

  return (
    <main style={page}>
      <section style={box}>
        <h1 style={{ margin: "16px 0" }}>Admin</h1>
        {!ok && <p style={{ color: "#b91c1c" }}>Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.</p>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setTab("cards")} style={{ ...btn, background: tab==="cards" ? "#bfdbfe" : "#e0e7ff" }}>Flashcards</button>
          <button onClick={() => setTab("quiz")}  style={{ ...btn, background: tab==="quiz"  ? "#bfdbfe" : "#e0e7ff" }}>Quiz</button>
          <button onClick={refresh} style={btn} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        </div>

        {tab === "cards" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={panel}>
              <h3 style={{ marginTop: 0 }}>Add Flashcard</h3>
              <div style={{ display: "grid", gap: 8 }}>
                <input style={input} placeholder="Term" value={term} onChange={e=>setTerm(e.target.value)} />
                <input style={input} placeholder="Definition" value={def} onChange={e=>setDef(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addCard} style={btn}>Add</button>
                  <label style={{ ...btn, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Upload CSV
                    <input type="file" accept=".csv" onChange={e => e.target.files && uploadCardsCSV(e.target.files[0])} style={{ display: "none" }} />
                  </label>
                </div>
              </div>
            </div>

            <div style={panel}>
              <h3 style={{ marginTop: 0 }}>Latest Flashcards</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {cards.map((c: any) => (
                  <li key={c.id}><strong>{c.term}</strong> — {c.def}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "quiz" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={panel}>
              <h3 style={{ marginTop: 0 }}>Add Quiz Item</h3>
              <div style={{ display: "grid", gap: 8 }}>
                <input style={input} placeholder="Question" value={q} onChange={e=>setQ(e.target.value)} />
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2,1fr)" }}>
                  <input style={input} placeholder="A" value={A} onChange={e=>setA(e.target.value)} />
                  <input style={input} placeholder="B" value={B} onChange={e=>setB(e.target.value)} />
                  <input style={input} placeholder="C" value={C} onChange={e=>setC(e.target.value)} />
                  <input style={input} placeholder="D" value={D} onChange={e=>setD(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label>Answer:</label>
                  <select value={ans} onChange={e=>setAns(e.target.value as any)} style={input}>
                    <option>A</option><option>B</option><option>C</option><option>D</option>
                  </select>
                </div>
                <textarea style={{ ...input, height: 80 }} placeholder="Rationale (optional)" value={why} onChange={e=>setWhy(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addQuiz} style={btn}>Add</button>
                  <label style={{ ...btn, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Upload CSV
                    <input type="file" accept=".csv" onChange={e => e.target.files && uploadQuizCSV(e.target.files[0])} style={{ display: "none" }} />
                  </label>
                </div>
              </div>
            </div>

            <div style={panel}>
              <h3 style={{ marginTop: 0 }}>Latest Quiz Items</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {quiz.map((it: any) => (
                  <li key={it.id}><strong>{it.question}</strong> — A:{it.a} B:{it.b} C:{it.c} D:{it.d} (Ans:{it.answer})</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
