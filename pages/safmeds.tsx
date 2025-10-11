// pages/safmeds.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlashCard,
  loadFlashcards,
  saveFlashcards,
  loadSafMedsTrials,
  saveSafMedsTrials,
  SafMedsTrial,
} from "../lib/storage";

export default function SafMedsPage() {
  const [deck, setDeck] = useState<FlashCard[]>([]);
  const [secs, setSecs] = useState(60);
  const [running, setRunning] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [current, setCurrent] = useState(0);
  const [trials, setTrials] = useState<SafMedsTrial[]>([]);
  const [flipped, setFlipped] = useState(false);

  // keep latest counts for saving at stop/auto-stop
  const correctRef = useRef(0);
  const errorsRef = useRef(0);
  const stoppingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate from DB first; fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      // flashcards from DB
      try {
        const fc = await fetch("/api/flashcards/list?deckId=default").then((r) => r.json());
        if (!cancelled && Array.isArray(fc.records) && fc.records.length) {
          setDeck(fc.records);
        } else if (!cancelled) {
          setDeck(loadFlashcards());
        }
      } catch {
        if (!cancelled) setDeck(loadFlashcards());
      }

      // trials from DB
      try {
        const tr = await fetch("/api/safmeds/listTrials?deckId=default").then((r) => r.json());
        if (!cancelled && Array.isArray(tr.records)) {
          const mapped: SafMedsTrial[] = tr.records.map((r: any) => ({
            timestamp: Number(r.timestamp_ms),
            correct: Number(r.correct),
            errors: Number(r.errors),
            secs: Number(r.secs),
          }));
          setTrials(mapped);
        } else if (!cancelled) {
          setTrials(loadSafMedsTrials());
        }
      } catch {
        if (!cancelled) setTrials(loadSafMedsTrials());
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // mirror counts into refs
  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);
  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  // timer
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          stopTrial(true); // auto-stop at 0
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const card = deck[current];

  function startTrial() {
    setCorrect(0);
    setErrors(0);
    correctRef.current = 0;
    errorsRef.current = 0;
    stoppingRef.current = false;

    setSecs(60);
    setFlipped(false);
    setRunning(true);
  }

  function stopTrial(auto = false) {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Save to local history
    const rec: SafMedsTrial = {
      timestamp: Date.now(),
      correct: correctRef.current,
      errors: errorsRef.current,
      secs: 60,
    };
    const next = [...trials, rec];
    setTrials(next);
    saveSafMedsTrials(next);

    // Persist to DB (non-blocking)
    fetch("/api/safmeds/addTrial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deckId: "default",
        timestamp_ms: rec.timestamp,
        correct: rec.correct,
        errors: rec.errors,
        secs: rec.secs,
      }),
    }).catch(() => {});

    // If auto, keep UI calm; if manual stop, do nothing special
  }

  const accuracy = useMemo(() => {
    const total = correct + errors;
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  }, [correct, errors]);

  function nextCard() {
    if (!deck.length) return;
    setCurrent((i) => (i + 1) % deck.length);
    setFlipped(false); // always show Term first
  }

  // Buttons rely on live "running" (buttons disabled when not running)
  function markCorrect() {
    if (!running) return;
    setCorrect((c) => {
      const v = c + 1;
      correctRef.current = v;
      return v;
    });
    nextCard();
  }

  function markError() {
    if (!running) return;
    setErrors((e) => {
      const v = e + 1;
      errorsRef.current = v;
      return v;
    });
    nextCard();
  }

  function onCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || "");
      const lines = txt.split(/\r?\n/).filter(Boolean);
      const rows: FlashCard[] = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (i === 0 && /term/i.test(parts[0])) continue;
        if (parts.length >= 2) rows.push({ term: parts[0].trim(), def: parts.slice(1).join(",").trim() });
      }
      saveFlashcards(rows); // local
      setDeck(rows);
      setCurrent(0);
      setFlipped(false);
      // optional: also push to DB if you added the bulkUpsert route
      fetch("/api/flashcards/bulkUpsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId: "default", records: rows }),
      }).catch(() => {});
    };
    reader.readAsText(f);
  }

  // Shuffle deck (disabled while running)
  function shuffleDeck() {
    if (running || deck.length < 2) return;
    const arr = deck.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setDeck(arr);
    setCurrent(0);
    setFlipped(false);
  }

  // Space flips card
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>SAFMEDS</h1>
      <p style={{ color: "#555" }}>
        One-minute timing. Use the same <code>term,def</code> CSV as Flashcards. Click the card (or press Space) to flip.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={importBtn}>
          Import CSV
          <input type="file" accept=".csv" onChange={onCSVUpload} style={{ display: "none" }} />
        </label>

        <button onClick={shuffleDeck} style={ghostBtn} disabled={running || deck.length < 2}>
          Shuffle Deck
        </button>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        {/* LEFT: Timer + Card + Buttons */}
        <div style={panel}>
          <div style={{ fontSize: 48, fontWeight: 800, textAlign: "center" }}>{secs}s</div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
            {!running ? (
              <button onClick={startTrial} style={primaryBtn}>Start</button>
            ) : (
              <button onClick={() => stopTrial(false)} style={dangerBtn}>Stop</button>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
            <Stat label="Correct" value={correct} />
            <Stat label="Errors" value={errors} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
          </div>

          {/* Flip Card */}
          <div
            onClick={() => setFlipped((f) => !f)}
            style={{
              marginTop: 16,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 24,
              minHeight: 140,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
              transition: "transform 0.15s",
            }}
            title="Click to flip"
          >
            {!card ? (
              <div style={{ color: "#666" }}>Import a deck to begin</div>
            ) : !flipped ? (
              <>
                <div style={{ fontWeight: 700, color: "#666" }}>Term</div>
                <div style={{ fontSize: 22 }}>{card.term}</div>
                <Hint />
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, color: "#666" }}>Definition</div>
                <div style={{ color: "#333" }}>{card.def}</div>
                <Hint flipped />
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={markCorrect} style={okBtn} disabled={!running}>
              Mark Correct
            </button>
            <button onClick={markError} style={warnBtn} disabled={!running}>
              Mark Error
            </button>
          </div>
        </div>

        {/* RIGHT: History + Chart */}
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Session History</h3>
          {trials.length === 0 ? (
            <div style={{ color: "#666" }}>No trials yet.</div>
          ) : (
            <>
              <BarChart trials={trials} />
              <ul style={{ marginTop: 12, paddingLeft: 18 }}>
                {trials.slice(-8).reverse().map((t, i) => (
                  <li key={t.timestamp + "_" + i}>
                    {new Date(t.timestamp).toLocaleString()} — Correct: <b>{t.correct}</b>, Errors: <b>{t.errors}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Hint({ flipped = false }: { flipped?: boolean }) {
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
      {flipped ? "Click (or Space) to show Term" : "Click (or Space) to show Definition"}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function BarChart({ trials }: { trials: SafMedsTrial[] }) {
  const last = trials.slice(-12);
  const max = Math.max(1, ...last.map((t) => t.correct));
  const w = 480, h = 160, pad = 24;
  const barW = (w - pad * 2) / (last.length || 1);

  return (
    <svg width={w} height={h} style={{ background: "#fafafa", borderRadius: 8, border: "1px solid #eee" }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#ccc" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#ccc" />
      {last.map((t, i) => {
        const x = pad + i * barW + 6;
        const bh = ((t.correct / max) * (h - pad * 2)) | 0;
        const y = h - pad - bh;
        return <rect key={t.timestamp + "_" + i} x={x} y={y} width={barW - 12} height={bh} fill="#0b3d91" />;
      })}
      <text x={pad} y={pad - 6} fontSize="10" fill="#555">max {max}</text>
    </svg>
  );
}

const panel: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
  minHeight: 260,
};

const importBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  background: "#0b3d91",
  color: "white",
  borderRadius: 8,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "white",
  color: "#0b3d91",
  border: "1px solid #0b3d91",
  borderRadius: 8,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "#0b3d91",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "#d64545",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const okBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#2bb673",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const warnBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#ffae42",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
