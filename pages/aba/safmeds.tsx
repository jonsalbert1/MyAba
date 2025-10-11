// SAFMEDS page with Supabase logging (plain CSS, no Tailwind)
// Place this file in /pages (e.g., /pages/safmeds.tsx). This version uses only inline styles and works
// without Tailwind. You can later extract these styles into your own CSS if you prefer.

import { useCallback, useEffect, useMemo, useRef, useState, CSSProperties } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Card = { term: string; def: string };
type SessionResult = {
  id: string;
  timestamp: number;
  durationSec: number;
  correct: number;
  errors: number;
  cpm: number;
  accuracy: number;
};

type UploadStatus = "idle" | "ok" | "error";

const STORAGE_DECK = "safmeds:deck";
const STORAGE_SESSIONS = "safmeds:sessions";
const STORAGE_DEVICE_ID = "safmeds:device_id";

function makeSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureDeviceId(): string {
  let id = localStorage.getItem(STORAGE_DEVICE_ID);
  if (!id) {
    id = (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) || Math.random().toString(36).slice(2);
    localStorage.setItem(STORAGE_DEVICE_ID, id);
  }
  return id;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Inline Styles (plain CSS) ----------
const layout: { [k: string]: CSSProperties } = {
  page: { minHeight: "100vh", background: "#f7f7f8" },
  header: {
    position: "sticky",
    top: 0,
    background: "rgba(255,255,255,0.9)",
    borderBottom: "1px solid #e5e7eb",
  },
  headerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  controlsRow: { display: "flex", gap: 12, alignItems: "center" },
  mainGrid: {
    maxWidth: 960,
    margin: "0 auto",
    padding: 24,
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 24,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
  },
  dashed: { border: "1px dashed #d1d5db" },
  statRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  stat: {
    textAlign: "center",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  statLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: 600 },
  flashcard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, textAlign: "center" },
  smallMuted: { fontSize: 13, color: "#6b7280", margin: 0, marginBottom: 6 },
  bigText: { fontSize: 22, fontWeight: 600, margin: "8px 0 16px" },
  btnRow: { display: "flex", gap: 12, justifyContent: "center" },
  sideCol: { display: "flex", flexDirection: "column", gap: 16 },
  footer: { maxWidth: 960, margin: "0 auto", padding: "24px", textAlign: "center", fontSize: 12, color: "#6b7280" },
};

const ui = {
  button: (opts?: { variant?: "primary" | "danger" | "success" | "neutral"; disabled?: boolean }): CSSProperties => {
    const base: CSSProperties = {
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 14,
      border: "1px solid transparent",
      cursor: opts?.disabled ? "not-allowed" : "pointer",
      opacity: opts?.disabled ? 0.6 : 1,
      color: "#fff",
      background: "#2563eb", // primary
    };
    switch (opts?.variant) {
      case "danger":
        return { ...base, background: "#dc2626" };
      case "success":
        return { ...base, background: "#16a34a" };
      case "neutral":
        return { ...base, background: "#f9fafb", color: "#111827", border: "1px solid #d1d5db" };
      default:
        return base;
    }
  },
  select: (disabled?: boolean): CSSProperties => ({
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
    opacity: disabled ? 0.6 : 1,
  }),
  cloudBadge: (bg: string, color: string): CSSProperties => ({
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    fontSize: 12,
    borderRadius: 8,
    padding: "4px 8px",
    background: bg,
    color,
  }),
};

export default function SAFMEDSPage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDef, setShowDef] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [durationSec, setDurationSec] = useState(60);
  const [order, setOrder] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);

  const [sb, setSb] = useState<SupabaseClient | null>(null);
  const [cloudStatus, setCloudStatus] = useState<UploadStatus>("idle");
  const lastFailedRef = useRef<SessionResult | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDeck(readJSON<Card[]>(STORAGE_DECK, []));
    setSessions(readJSON<SessionResult[]>(STORAGE_SESSIONS, []));
    setSb(makeSupabase());
    ensureDeviceId();
  }, []);

  useEffect(() => {
    writeJSON(STORAGE_SESSIONS, sessions);
  }, [sessions]);

  const hasDeck = deck.length > 0;
  const currentCard = hasDeck && order.length > 0 ? deck[order[index % order.length]] : null;

  const startRun = useCallback(() => {
    if (!hasDeck) return;
    setOrder(shuffle(deck.map((_, i) => i)));
    setCorrect(0);
    setErrors(0);
    setShowDef(false);
    setIndex(0);
    setIsRunning(true);
    setSecondsLeft(durationSec);

    const start = Date.now();
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsRunning(false);
          const elapsed = Math.max(1, Math.round((Date.now() - start) / 1000));
          const cpm = correct / (elapsed / 60);
          const acc = correct + errors === 0 ? 0 : correct / (correct + errors);
          const newResult: SessionResult = {
            id: (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2),
            timestamp: Date.now(),
            durationSec: elapsed,
            correct,
            errors,
            cpm: Number(cpm.toFixed(2)),
            accuracy: Number(acc.toFixed(4)),
          };
          setSessions((prev) => [...prev, newResult]);
          void uploadToSupabase(newResult);
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;
  }, [deck, durationSec, hasDeck, correct, errors]);

  const stopRun = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    setIsRunning(false);
  }, []);

  const mark = (ok: boolean) => {
    if (!isRunning) return;
    ok ? setCorrect((c) => c + 1) : setErrors((e) => e + 1);
    setShowDef(false);
    setIndex((i) => (i + 1) % deck.length);
  };

  const uploadDeck = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      const text = String(e.target?.result ?? "");
      const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(",").map((x) => x.trim().toLowerCase());
      const t = headers.indexOf("term"), d = headers.indexOf("def");
      if (t < 0 || d < 0) return alert("CSV must have headers term,def");
      const parsed = lines.map((l) => l.split(",")).map((a) => ({ term: a[t], def: a[d] })).filter((x) => x.term && x.def);
      setDeck(parsed);
      writeJSON(STORAGE_DECK, parsed);
    };
    r.readAsText(file);
  };

  const graphData = useMemo(
    () =>
      sessions.map((s, i) => ({
        session: i + 1,
        cpm: s.cpm,
        correct: s.correct,
        errors: s.errors,
      })),
    [sessions]
  );

  async function uploadToSupabase(result: SessionResult) {
    if (!sb) {
      setCloudStatus("error");
      lastFailedRef.current = result;
      return;
    }
    try {
      const deviceId = ensureDeviceId();
      const { error } = await sb.from("safmeds_sessions").insert({
        duration_sec: result.durationSec,
        correct: result.correct,
        errors: result.errors,
        cpm: result.cpm,
        accuracy: result.accuracy,
        deck_size: deck.length,
        device_id: deviceId,
        local_timestamp_ms: result.timestamp,
        app_version: typeof window !== "undefined" ? `web-${navigator.userAgent}` : "web",
      });
      if (error) throw error;
      setCloudStatus("ok");
      lastFailedRef.current = null;
    } catch (e) {
      console.warn("Supabase upload failed", e);
      setCloudStatus("error");
      lastFailedRef.current = result;
    }
  }

  const retryLastUpload = async () => {
    if (lastFailedRef.current) {
      await uploadToSupabase(lastFailedRef.current);
    }
  };

  // Cloud badge colors
  const badgeCfg = (() => {
    if (!sb) return { bg: "#e5e7eb", color: "#374151", label: "Not configured" };
    if (cloudStatus === "ok") return { bg: "#dcfce7", color: "#14532d", label: "Uploaded" };
    if (cloudStatus === "error") return { bg: "#fee2e2", color: "#7f1d1d", label: "Upload failed" };
    return { bg: "#dbeafe", color: "#1e3a8a", label: "Ready" };
  })();

  return (
    <main style={layout.page}>
      <header style={layout.header}>
        <div style={layout.headerInner}>
          <h1 style={layout.h1}>SAFMEDS</h1>
          <div style={layout.controlsRow}>
            <div style={ui.cloudBadge(badgeCfg.bg, badgeCfg.color)}>
              <span>☁️</span>
              <span>{badgeCfg.label}</span>
              {cloudStatus === "error" && sb && (
                <button onClick={retryLastUpload} style={{ textDecoration: "underline", background: "transparent", border: 0, cursor: "pointer", color: badgeCfg.color }}>retry</button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: "#374151" }}>Duration</span>
              <select
                style={ui.select(isRunning)}
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value))}
                disabled={isRunning}
              >
                {[30, 45, 60, 90, 120].map((s) => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </div>
            <button
              onClick={isRunning ? stopRun : startRun}
              disabled={!hasDeck}
              style={ui.button({ variant: isRunning ? "danger" : "primary", disabled: !hasDeck })}
            >
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
        </div>
      </header>

      <section style={layout.mainGrid as CSSProperties}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!hasDeck && (
            <div style={{ ...layout.card, ...layout.dashed }}>
              <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 8px" }}>Upload CSV (term,def) or load a sample deck.</p>
              <input type="file" accept=".csv" onChange={(e) => e.target.files && uploadDeck(e.target.files[0])} />
              <button
                style={{ ...ui.button({ variant: "neutral" }), marginLeft: 12 }}
                onClick={() => {
                  const sample = [
                    { term: "Positive Reinforcement", def: "Add stimulus; behavior increases" },
                    { term: "Negative Reinforcement", def: "Remove stimulus; behavior increases" },
                    { term: "Extinction", def: "Withhold reinforcement; behavior decreases" },
                  ];
                  setDeck(sample);
                  writeJSON(STORAGE_DECK, sample);
                }}
              >
                Load Sample
              </button>
            </div>
          )}

          <div style={layout.statRow}>
            <div style={layout.stat}>
              <div style={layout.statLabel}>Time</div>
              <div style={layout.statVal}>{`${secondsLeft}s`}</div>
            </div>
            <div style={layout.stat}>
              <div style={layout.statLabel}>Correct</div>
              <div style={layout.statVal}>{String(correct)}</div>
            </div>
            <div style={layout.stat}>
              <div style={layout.statLabel}>Errors</div>
              <div style={layout.statVal}>{String(errors)}</div>
            </div>
          </div>

          <motion.div key={`${index}-${showDef}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={layout.flashcard}>
              {currentCard ? (
                <>
                  <p style={layout.smallMuted}>Card {index + 1}</p>
                  <div style={layout.bigText}>{showDef ? currentCard.def : currentCard.term}</div>
                  <div style={layout.btnRow}>
                    <button style={ui.button({ variant: "neutral" })} onClick={() => setShowDef((v) => !v)}>
                      {showDef ? "Show Term" : "Show Definition"}
                    </button>
                    <button style={ui.button({ variant: "success", disabled: !isRunning })} disabled={!isRunning} onClick={() => mark(true)}>
                      ✓ Correct
                    </button>
                    <button style={ui.button({ variant: "danger", disabled: !isRunning })} disabled={!isRunning} onClick={() => mark(false)}>
                      ✗ Error
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ color: "#6b7280", margin: 0 }}>No cards loaded.</p>
              )}
            </div>
          </motion.div>
        </div>

        <div style={layout.sideCol}>
          <div style={layout.card}>
            <h3 style={{ margin: 0, fontWeight: 600, marginBottom: 8 }}>CPM Progress</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpm" stroke="#2563eb" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={layout.card}>
            <h3 style={{ margin: 0, fontWeight: 600, marginBottom: 8 }}>Correct vs Errors</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="correct" fill="#16a34a" />
                  <Bar dataKey="errors" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <footer style={layout.footer}>
        Local persistence is always on. Cloud logging {sb ? "is configured." : "is NOT configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."}
      </footer>
    </main>
  );
}

// Cloud badge component (plain CSS)
function CloudBadge({ status, configured, onRetry }: { status: UploadStatus; configured: boolean; onRetry: () => void }) {
  // NOTE: Kept for reference if you want a separate component version later.
  return null;
}
