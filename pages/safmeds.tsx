// SAFMEDS page with Supabase logging
// Place this file in /pages, not /pages/api
// Files in /pages/api are reserved for backend API routes, so this should be saved as /pages/safmeds.tsx
// This version uses Supabase logging, localStorage persistence, and performance graphs.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white/80 border-b">
        <div className="mx-auto max-w-5xl px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">SAFMEDS</h1>
          <div className="flex gap-3 items-center">
            <CloudBadge status={cloudStatus} configured={!!sb} onRetry={retryLastUpload} />
            <DurationPicker value={durationSec} onChange={setDurationSec} disabled={isRunning} />
            <button
              onClick={isRunning ? stopRun : startRun}
              disabled={!hasDeck}
              className={`px-4 py-2 rounded-xl text-white ${isRunning ? "bg-red-600" : "bg-blue-600"}`}
            >
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 space-y-4">
          {!hasDeck && (
            <div className="p-6 bg-white rounded-xl border border-dashed">
              <p className="text-gray-600 mb-2">Upload CSV (term,def) or load a sample deck.</p>
              <input type="file" accept=".csv" onChange={(e) => e.target.files && uploadDeck(e.target.files[0])} />
              <button
                className="ml-3 border px-3 py-1 rounded-lg"
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

          <div className="grid grid-cols-3 gap-4">
            <Stat label="Time" val={`${secondsLeft}s`} />
            <Stat label="Correct" val={String(correct)} />
            <Stat label="Errors" val={String(errors)} />
          </div>

          <motion.div key={`${index}-${showDef}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border rounded-2xl p-6 text-center">
            {currentCard ? (
              <>
                <p className="text-sm text-gray-500 mb-1">Card {index + 1}</p>
                <h2 className="text-2xl font-semibold mb-4">{showDef ? currentCard.def : currentCard.term}</h2>
                <div className="flex justify-center gap-3">
                  <button className="border px-3 py-2 rounded-lg" onClick={() => setShowDef((v) => !v)}>
                    {showDef ? "Show Term" : "Show Definition"}
                  </button>
                  <button className="bg-green-600 text-white px-3 py-2 rounded-lg" disabled={!isRunning} onClick={() => mark(true)}>
                    ✓ Correct
                  </button>
                  <button className="bg-red-600 text-white px-3 py-2 rounded-lg" disabled={!isRunning} onClick={() => mark(false)}>
                    ✗ Error
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No cards loaded.</p>
            )}
          </motion.div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">CPM Progress</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpm" stroke="#2563eb" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Correct vs Errors</h3>
            <ResponsiveContainer width="100%" height={200}>
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
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-gray-500">
        Local persistence is always on. Cloud logging {sb ? "is configured." : "is NOT configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."}
      </footer>
    </main>
  );
}

const Stat = ({ label, val }: { label: string; val: string }) => (
  <div className="bg-white border rounded-xl p-4 text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-xl font-semibold">{val}</p>
  </div>
);

const DurationPicker = ({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) => (
  <select className="border rounded-lg px-2 py-1" value={value} onChange={(e) => onChange(parseInt(e.target.value))} disabled={disabled}>
    {[30, 45, 60, 90, 120].map((s) => (
      <option key={s} value={s}>
        {s}s
      </option>
    ))}
  </select>
);

function CloudBadge({ status, configured, onRetry }: { status: UploadStatus; configured: boolean; onRetry: () => void }) {
  const label = !configured ? "Not configured" : status === "ok" ? "Uploaded" : status === "error" ? "Upload failed" : "Ready";
  const color = !configured ? "bg-gray-200 text-gray-700" : status === "ok" ? "bg-green-100 text-green-700" : status === "error" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";
  return (
    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg ${color}`}>
      <span>☁️</span>
      <span>{label}</span>
      {status === "error" && configured && (
        <button className="underline" onClick={onRetry}>retry</button>
      )}
    </div>
  );
}
