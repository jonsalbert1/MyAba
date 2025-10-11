// pages/flashcards.tsx
import { useEffect, useMemo, useState } from "react";
import { FlashCard, loadFlashcards, saveFlashcards } from "../lib/storage";

export default function FlashcardsPage() {
  const [deck, setDeck] = useState<FlashCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = deck[idx];

  // Hydrate from Supabase first; fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/flashcards/list?deckId=default");
        const json = await res.json();
        if (!cancelled && Array.isArray(json.records) && json.records.length) {
          setDeck(json.records);
          setIdx(0);
          setFlipped(false);
          return;
        }
      } catch {
        // ignore and fall back
      }
      if (!cancelled) setDeck(loadFlashcards());
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const progress = useMemo(() => {
    if (deck.length === 0) return "0 / 0";
    return `${idx + 1} / ${deck.length}`;
  }, [idx, deck.length]);

  const next = () => {
    setFlipped(false);
    setIdx((i) => (deck.length ? (i + 1) % deck.length : 0));
  };

  const prev = () => {
    setFlipped(false);
    setIdx((i) => (deck.length ? (i - 1 + deck.length) % deck.length : 0));
  };

  function onCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || "");
      // CSV with header: term,def
      const lines = txt.split(/\r?\n/).filter(Boolean);
      const rows: FlashCard[] = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (i === 0 && /term/i.test(parts[0])) continue;
        if (parts.length >= 2) {
          rows.push({ term: parts[0].trim(), def: parts.slice(1).join(",").trim() });
        }
      }
      // persist locally
      saveFlashcards(rows);
      // optimistic UI
      setDeck(rows);
      setIdx(0);
      setFlipped(false);
      // persist to DB (non-blocking)
      fetch("/api/flashcards/bulkUpsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId: "default", records: rows }),
      }).catch(() => {});
    };
    reader.readAsText(f);
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Flashcards</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Click the card to flip. Import CSV with headers <code>term,def</code>.
      </p>

      <label
        style={{
          display: "inline-block",
          padding: "10px 14px",
          background: "#0b3d91",
          color: "white",
          borderRadius: 8,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        Import CSV
        <input type="file" accept=".csv" onChange={onCSVUpload} style={{ display: "none" }} />
      </label>

      <div style={{ marginBottom: 12, color: "#666" }}>
        Cards: {deck.length} &middot; {progress}
      </div>

      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          userSelect: "none",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 30,
          minHeight: 180,
          boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          cursor: "pointer",
          transition: "transform 0.2s",
        }}
      >
        {card ? (flipped ? card.def : card.term) : "No cards yet. Import a CSV."}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={prev} style={btn}>Prev</button>
        <button onClick={next} style={btn}>Next</button>
      </div>
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  cursor: "pointer",
};
