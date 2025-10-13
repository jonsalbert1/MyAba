// pages/flashcards.tsx
import { useEffect, useMemo, useState } from "react";

type Card = {
  id: string;
  term: string;
  definition: string | null;
  domain?: string | null;
  deck?: string | null;
  created_at?: string;
};

export default function Flashcards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffle, setShuffle] = useState(true);
  const [seed, setSeed] = useState<number>(() => Date.now());

  // Deck from ?deck= (default GLOBAL)
  const deck = useMemo(() => {
    if (typeof window === "undefined") return "GLOBAL";
    const d = new URLSearchParams(window.location.search).get("deck");
    return d && d.trim() ? d.trim() : "GLOBAL";
  }, [typeof window]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/flashcards?deck=${encodeURIComponent(deck)}`);
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "Failed to load cards");
        const list: Card[] = (j.data || []).filter(c => (c.term || "").trim().length > 0);
        setCards(list);
        setIdx(0);
        setFlipped(false);
        setErr(list.length ? null : "No cards found in this deck.");
      } catch (e: any) {
        setErr(e.message || "Failed to load cards");
      } finally {
        setLoading(false);
      }
    })();
  }, [deck]);

  // Seeded shuffle (stable across re-renders until seed changes)
  const ordered = useMemo(() => {
    const arr = cards.slice();
    if (!shuffle) return arr;
    let s = seed >>> 0;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [cards, shuffle, seed]);

  const current = ordered[idx];

  function next() {
    if (!ordered.length) return;
    setIdx(i => (i + 1) % ordered.length);
    setFlipped(false);
  }
  function prev() {
    if (!ordered.length) return;
    setIdx(i => (i - 1 + ordered.length) % ordered.length);
    setFlipped(false);
  }

  // keyboard: Space/Enter flips; arrows move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ordered.length) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ordered.length]);

  const btn = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" } as const;
  const badge = { fontSize: 11, padding: "2px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999 } as const;

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Flashcards</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>Deck:</label>
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
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => { setShuffle(e.target.checked); setSeed(Date.now()); setIdx(0); setFlipped(false); }}
            />
            Shuffle
          </label>
          <a href="/safmeds" style={{ textDecoration: "underline" }}>SAFMEDS →</a>
        </div>
      </header>

      {loading && <p style={{ opacity: 0.7 }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {!loading && !err && ordered.length > 0 && (
        <>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
            Card {idx + 1} of {ordered.length}
          </div>

          {/* Single card viewer: front/back swap (no 3D) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped(f => !f)}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setFlipped(f => !f)}
            style={{
              position: "relative",
              height: 260,
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
              <strong style={{ fontSize: 20, lineHeight: 1.25, wordBreak: "break-word" }}>{current?.term}</strong>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge}>{current?.deck || "GLOBAL"}</span>
                {current?.domain && <span style={badge}>{current.domain}</span>}
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
              <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, wordBreak: "break-word", fontSize: 16 }}>
                {(current?.definition && current.definition.trim().length > 0) ? current.definition : "(no definition)"}
              </div>
              <span style={{ marginTop: "auto", fontSize: 12, opacity: 0.8 }}>Click / Space to flip back</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={prev} style={btn}>← Prev</button>
            <button onClick={() => setFlipped(f => !f)} style={btn}>{flipped ? "Show Term" : "Show Definition"}</button>
            <button onClick={next} style={btn}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
