import { useEffect, useMemo, useRef, useState } from "react";

/** ---- Types ---- */
type Card = {
  id: string;
  term: string;
  definition: string | null;
  domain?: string | null;
  deck?: string | null;
  created_at?: string;
};

type Session = {
  id: string;
  deck: string | null;
  correct: number;
  incorrect: number;
  duration_seconds: number;
  run_started_at: string; // ISO
  notes?: string | null;
};

type ApiList<T> = { ok: boolean; data: T[]; error?: string };
type ApiPost<T> = { ok: boolean; data?: T; error?: string };

/** ---- Deck param ---- */
function useDeckFromQuery(defaultDeck = "GLOBAL") {
  const [deck, setDeck] = useState(defaultDeck);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const d = new URLSearchParams(window.location.search).get("deck");
    setDeck(d && d.trim() ? d.trim() : defaultDeck);
  }, []);
  return deck;
}

export default function SAFMEDS() {
  const deck = useDeckFromQuery("GLOBAL");

  /** ---- Timer state ---- */
  const [duration, setDuration] = useState<number>(60);
  const [remaining, setRemaining] = useState<number>(60);
  const [running, setRunning] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [notes, setNotes] = useState("");
  const tickRef = useRef<number | null>(null);
  const t0Ref = useRef<number | null>(null);

  /** ---- Flashcards (deck) ---- */
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsErr, setCardsErr] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(true);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  /** ---- History / sessions ---- */
  const [loadingSess, setLoadingSess] = useState(true);
  const [sessErr, setSessErr] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  /** ---- Load flashcards for deck ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingCards(true);
        const r = await fetch(`/api/flashcards?deck=${encodeURIComponent(deck)}`);
        const j: ApiList<Card> & { matched?: number } = await r.json();
        if (!j.ok) throw new Error(j.error || "Failed to load cards");
        const list = (j.data || []).filter(c => (c.term || "").trim().length > 0);
        setCards(list);
        setIdx(0);
        setFlipped(false);
        setCardsErr(list.length ? null : "No cards found for this deck.");
      } catch (e: any) {
        setCardsErr(e.message || "Failed to load cards");
      } finally {
        setLoadingCards(false);
      }
    })();
  }, [deck]);

  /** ---- Load sessions for deck ---- */
  async function loadSessions() {
    try {
      setLoadingSess(true);
      const r = await fetch(`/api/safmeds?deck=${encodeURIComponent(deck)}`);
      const j: ApiList<Session> = await r.json();
      if (!j.ok) throw new Error(j.error || "Failed to load sessions");
      setSessions(j.data || []);
      setSessErr(null);
    } catch (e: any) {
      setSessErr(e.message || "Failed to load sessions");
    } finally {
      setLoadingSess(false);
    }
  }
  useEffect(() => { loadSessions(); }, [deck]);

  /** ---- Study order (seeded shuffle) ---- */
  const order: Card[] = useMemo(() => {
    const arr = cards.slice();
    if (!shuffle) return arr;
    // Seeded Fisher–Yates
    let s = seed >>> 0;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [cards, shuffle, seed]);

  const current = order[idx] as Card | undefined;

  /** ---- Timer loop ---- */
  useEffect(() => {
    if (!running) return;
    t0Ref.current = performance.now();
    setRemaining(duration);
    const loop = (now: number) => {
      if (!t0Ref.current) return;
      const elapsed = Math.floor((now - t0Ref.current) / 1000);
      const left = Math.max(duration - elapsed, 0);
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        if (tickRef.current) cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
        // autosave when time hits zero
        saveSession();
        return;
      }
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
    return () => { if (tickRef.current) cancelAnimationFrame(tickRef.current); tickRef.current = null; };
  }, [running, duration]);

  function resetCounters() {
    setCorrect(0);
    setIncorrect(0);
    setRemaining(duration);
    setFlipped(false);
    setIdx(0);
  }

  function start() {
    if (running) return;
    setFlipped(false);
    setIdx(0);
    setRunning(true);
  }

  function stop() {
    if (!running) return;
    setRunning(false);
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    tickRef.current = null;
    saveSession(); // manual stop also saves
  }

  /** ---- Mark & advance ---- */
  function nextCard() {
    if (order.length === 0) return;
    setIdx(i => (i + 1) % order.length);
    setFlipped(false);
  }
  function prevCard() {
    if (order.length === 0) return;
    setIdx(i => (i - 1 + order.length) % order.length);
    setFlipped(false);
  }
  function markCorrect() {
    if (!running) return;
    setCorrect(x => x + 1);
    nextCard();
  }
  function markIncorrect() {
    if (!running) return;
    setIncorrect(x => x + 1);
    nextCard();
  }

  /** ---- Keyboard: while running, Space flips; C/I grade; Arrows move ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!running) {
        if (k === " ") { e.preventDefault(); start(); }
        return;
      }
      if (k === " ") { e.preventDefault(); setFlipped(f => !f); }
      else if (k === "c") { e.preventDefault(); markCorrect(); }
      else if (k === "i") { e.preventDefault(); markIncorrect(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nextCard(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevCard(); }
      else if (k === "escape") { e.preventDefault(); stop(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, order.length]);

  /** ---- Save session to API ---- */
  async function saveSession() {
    const payload = {
      deck: deck || "GLOBAL",
      correct,
      incorrect,
      duration_seconds: duration,
      notes: notes.trim() || null,
    };
    try {
      const r = await fetch("/api/safmeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j: ApiPost<Session> = await r.json();
      if (!j.ok) throw new Error(j.error || "Failed to save session");
      await loadSessions();
      resetCounters();
      setNotes("");
    } catch (e: any) {
      alert(e.message || "Failed to save session");
    }
  }

  const totalCards = correct + incorrect;
  const pct = totalCards > 0 ? Math.round((correct / totalCards) * 100) : 0;

  /** ---- Aggregate by local day for the graph ---- */
  type DayPoint = { day: string; total: number; correct: number; incorrect: number; sessions: number };
  const daily: DayPoint[] = useMemo(() => {
    const byDay: Record<string, DayPoint> = {};
    for (const s of sessions) {
      const d = new Date(s.run_started_at);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      if (!byDay[key]) byDay[key] = { day: key, total: 0, correct: 0, incorrect: 0, sessions: 0 };
      byDay[key].correct += s.correct;
      byDay[key].incorrect += s.incorrect;
      byDay[key].total += s.correct + s.incorrect;
      byDay[key].sessions += 1;
    }
    return Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));
  }, [sessions]);

  /** ---- Simple SVG line chart (daily totals) ---- */
  function LineChart({ data, height = 180 }: { data: DayPoint[]; height?: number }) {
    const padding = 28;
    const width = Math.max(320, data.length * 48 + padding * 2);

    const ys = data.map((d) => d.total);
    const maxY = Math.max(10, ...ys);
    const xScale = (i: number) =>
      padding + (data.length <= 1 ? (width - padding * 2) / 2 : (i * (width - padding * 2)) / (data.length - 1));
    const yScale = (v: number) =>
      height - padding - ((v - 0) / (maxY - 0)) * (height - padding * 2);

    const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.total)}`).join(" ");

    return (
      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
        <svg width={width} height={height}>
          <line x1={28} y1={height - 28} x2={width - 28} y2={height - 28} stroke="#cbd5e1" />
          <line x1={28} y1={28} x2={28} y2={height - 28} stroke="#cbd5e1" />
          {Array.from({ length: 4 }).map((_, i) => {
            const v = Math.round((i * maxY) / 3);
            const y = yScale(v);
            return (
              <g key={i}>
                <line x1={28 - 4} y1={y} x2={width - 28} y2={y} stroke="#f1f5f9" />
                <text x={6} y={y + 4} fontSize={10} fill="#64748b">{v}</text>
              </g>
            );
          })}
          {data.map((d, i) => (
            <text key={d.day} x={xScale(i)} y={height - 28 + 14} fontSize={10} fill="#64748b" textAnchor="middle">
              {d.day.slice(5)}
            </text>
          ))}
          <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={2} />
          {data.map((d, i) => (
            <circle key={d.day} cx={xScale(i)} cy={yScale(d.total)} r={3} fill="#0ea5e9" />
          ))}
        </svg>
      </div>
    );
  }

  /** ---- Styles ---- */
  const btn = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" } as const;
  const btnPrimary = { padding: "8px 12px", borderRadius: 8, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff" } as const;

  /** ---- UI ---- */
  return (
    <div style={{ maxWidth: 960, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>SAFMEDS</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, opacity: 0.7 }}>Deck:</label>
          <input
            defaultValue={deck}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim() || "GLOBAL";
                const url = new URL(window.location.href);
                url.searchParams.set("deck", v);
                window.location.href = url.toString();
              }
            }}
            placeholder="GLOBAL"
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </div>
      </header>

      {/* Timer + card + grading */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", marginBottom: 16 }}>
        {/* Top controls */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label>Duration:</label>
          <select
            value={duration}
            onChange={(e) => { const d = parseInt(e.target.value, 10); setDuration(d); setRemaining(d); }}
            disabled={running}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          >
            {[30, 45, 60, 90, 120].map((s) => <option key={s} value={s}>{s}s</option>)}
          </select>

          <label style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8, fontSize: 13 }}>
            <input type="checkbox" checked={shuffle} onChange={(e) => { setShuffle(e.target.checked); setSeed(Date.now()); setIdx(0); setFlipped(false); }} disabled={running} />
            Shuffle
          </label>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 28, minWidth: 80, textAlign: "center" }}>
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
            </div>
            {!running ? (
              <button onClick={start} style={btnPrimary}>Start (Space)</button>
            ) : (
              <button onClick={stop} style={{ ...btnPrimary, border: "1px solid #ef4444", background: "#ef4444" }}>Stop (Esc)</button>
            )}
          </div>
        </div>

        {/* Card viewport */}
        <div style={{ marginTop: 16 }}>
          {loadingCards ? (
            <p style={{ opacity: 0.7 }}>Loading cards…</p>
          ) : cardsErr ? (
            <p style={{ color: "#b91c1c" }}>{cardsErr}</p>
          ) : order.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No cards in <b>{deck}</b>. Add some in <a href="/admin">/admin</a>.</p>
          ) : (
            <>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                Card {order.length ? idx + 1 : 0} of {order.length}
              </div>

              {/* Card: front/back swap (no 3D) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped(f => !f)}
                onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setFlipped(f => !f)}
                style={{
                  position: "relative",
                  height: 240,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  background: "#fff",
                  cursor: "pointer",
                }}
                title={flipped ? "Click to show term" : "Click to reveal definition"}
              >
                {/* FRONT (term) */}
                <div
                  style={{
                    position: "absolute", inset: 0, padding: 16, display: "flex", flexDirection: "column",
                    opacity: flipped ? 0 : 1, visibility: flipped ? "hidden" : "visible",
                    transition: "opacity .18s ease, visibility .18s ease",
                  }}
                >
                  <strong style={{ fontSize: 18, lineHeight: 1.25, wordBreak: "break-word" }}>{current?.term}</strong>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999 }}>
                      {current?.deck || "GLOBAL"}
                    </span>
                    {current?.domain && (
                      <span style={{ fontSize: 11, padding: "2px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999 }}>
                        {current.domain}
                      </span>
                    )}
                  </div>
                  <p style={{ marginTop: "auto", fontSize: 12, opacity: 0.6 }}>Click / Space to reveal definition</p>
                </div>

                {/* BACK (definition only) */}
                <div
                  style={{
                    position: "absolute", inset: 0, padding: 16, display: "flex", flexDirection: "column",
                    opacity: flipped ? 1 : 0, visibility: flipped ? "visible" : "hidden",
                    transition: "opacity .18s ease, visibility .18s ease",
                    background: "#0f172a", color: "#fff",
                  }}
                >
                  <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, wordBreak: "break-word", fontSize: 15 }}>
                    {(current?.definition && current.definition.trim().length > 0) ? current.definition : "(no definition)"}
                  </div>
                  <span style={{ marginTop: "auto", fontSize: 12, opacity: 0.8 }}>Click / Space to flip back</span>
                </div>
              </div>

              {/* Grading buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
                <button onClick={prevCard} disabled={!order.length || !running} style={btn}>← Prev</button>
                <button
                  onClick={markCorrect}
                  disabled={!running}
                  style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #22c55e", background: "#22c55e", color: "#fff", minWidth: 120 }}
                  title="C key"
                >
                  ✓ Correct ({correct})
                </button>
                <button
                  onClick={markIncorrect}
                  disabled={!running}
                  style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ef4444", background: "#ef4444", color: "#fff", minWidth: 120 }}
                  title="I key"
                >
                  ✗ Incorrect ({incorrect})
                </button>
                <button onClick={nextCard} disabled={!order.length || !running} style={btn}>Next →</button>

                <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                  <div style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc" }}>
                    Total: <b>{totalCards}</b>
                  </div>
                  <div style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f1f5f9" }}>
                    Accuracy: <b>{pct}%</b>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notes + save/reset */}
        <div style={{ marginTop: 12 }}>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)…"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            disabled={running}
          />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => { resetCounters(); setNotes(""); }} disabled={running} style={btn}>Reset</button>
          {!running && totalCards > 0 && (
            <button onClick={saveSession} style={btnPrimary}>Save Run</button>
          )}
        </div>
      </section>

      {/* Graph */}
      <section style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 8px" }}>Daily totals</h2>
        {loadingSess ? (
          <p style={{ opacity: 0.7 }}>Loading…</p>
        ) : daily.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No sessions yet for <b>{deck}</b>.</p>
        ) : (
          <>
            <LineChart data={daily} />
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Total per day (correct + incorrect). Deck: <b>{deck}</b>
            </div>
          </>
        )}
      </section>

      {/* Recent sessions */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Recent runs</h3>
        {loadingSess ? (
          <p style={{ opacity: 0.7 }}>Loading…</p>
        ) : sessions.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No runs yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {sessions.slice().reverse().slice(0, 20).map((s) => {
              const t = new Date(s.run_started_at);
              const total = s.correct + s.incorrect;
              const acc = total ? Math.round((s.correct / total) * 100) : 0;
              return (
                <li key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
                    <div>
                      <b>{t.toLocaleDateString()} {t.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{s.duration_seconds}s · {s.deck || "GLOBAL"} {s.notes ? `· ${s.notes}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ padding: "4px 8px", borderRadius: 6, background: "#dcfce7", border: "1px solid #86efac" }}>✓ {s.correct}</span>
                      <span style={{ padding: "4px 8px", borderRadius: 6, background: "#fee2e2", border: "1px solid #fca5a5" }}>✗ {s.incorrect}</span>
                      <span style={{ padding: "4px 8px", borderRadius: 6, background: "#f1f5f9", border: "1px solid #e2e8f0" }}>Σ {total}</span>
                      <span style={{ padding: "4px 8px", borderRadius: 6, background: "#e0f2fe", border: "1px solid #bae6fd" }}>{acc}%</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
