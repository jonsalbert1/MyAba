// pages/flashcards.tsx
import Head from "next/head";
import { useEffect, useMemo, useState, useCallback } from "react";

type Card = {
  id: string;
  term?: string | null;
  definition?: string | null;
  deck?: string | null;
  created_at?: string | null;
};

// ---------- helper: parse deck from URL ----------
function initialDeck(): string {
  try {
    if (typeof window === "undefined") return "GLOBAL";
    const d = new URLSearchParams(window.location.search).get("deck");
    return d && d.trim() ? d.trim() : "GLOBAL";
  } catch {
    return "GLOBAL";
  }
}

// ---------- helper: fetch cards from /api/flashcards ----------
async function fetchCards(params: { deck?: string; domain?: string; code?: string }) {
  const p = new URLSearchParams();
  if (params.deck)   p.set("deck", params.deck);
  if (params.domain) p.set("domain", params.domain);
  if (params.code)   p.set("code", params.code);

  const resp = await fetch(`/api/flashcards?${p.toString()}`, { cache: "no-store" });
  // If the endpoint itself fails (5xx/4xx), surface the status
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json();

  // Accept either { cards: [...] } or { ok:true, cards:[...] }
  if (Array.isArray(json?.cards)) {
    return json.cards as Card[];
  }
  if (json?.ok && Array.isArray(json?.cards)) {
    return json.cards as Card[];
  }

  // Some older handlers return { data: [...] }
  if (Array.isArray(json?.data)) {
    return json.data as Card[];
  }

  // If we get here, shape is wrong — show a readable error
  throw new Error(
    `Malformed /api/flashcards response: ${JSON.stringify(json).slice(0, 300)}`
  );
}

// Fisher–Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STORAGE_KEY = "flashcards_shuffle_on_load";

export default function FlashcardsPage() {
  const [deck, setDeck] = useState<string>(() => initialDeck());
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [showDef, setShowDef] = useState(false);
  const [msg, setMsg] = useState("loading…");
  const [shuffleOnLoad, setShuffleOnLoad] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // Load pref
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw !== null) setShuffleOnLoad(raw === "true");
    } catch {}
  }, []);

  // Persist pref
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(shuffleOnLoad));
    } catch {}
  }, [shuffleOnLoad]);

  // Fetch function
  const load = useCallback(async (deckName: string) => {
    setLoading(true);
    try {
      const data = await fetchCards({ deck: deckName || "GLOBAL" });
      const final = shuffleOnLoad ? shuffleArray(data) : data;
      setCards(final);
      setMsg(`loaded ${data.length} cards${shuffleOnLoad ? " (shuffled)" : ""}`);
      setIdx(0);
      setShowDef(false);
    } catch (e: any) {
      setCards([]);
      setMsg(`fetch error: ${e?.message ?? "unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [shuffleOnLoad]);

  // Load on mount and when shuffle pref toggles
  useEffect(() => {
    load(deck);
  }, [deck, shuffleOnLoad, load]);

  // Keep idx in bounds when cards length changes
  useEffect(() => {
    if (!cards.length) {
      setIdx(0);
      setShowDef(false);
      return;
    }
    setIdx((i) => Math.min(i, cards.length - 1));
    setShowDef(false);
  }, [cards.length]);

  useEffect(() => { setShowDef(false); }, [idx]);

  const next = useCallback(() => {
    if (!cards.length) return;
    setIdx((i) => (i + 1) % cards.length);
  }, [cards.length]);

  const prev = useCallback(() => {
    if (!cards.length) return;
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const flip = useCallback(() => setShowDef((s) => !s), []);

  const shuffleNow = useCallback(() => {
    if (!cards.length) return;
    setCards((prev) => shuffleArray(prev));
    setIdx(0);
    setShowDef(false);
    setMsg(`shuffled ${cards.length} cards`);
  }, [cards.length]);

  // Keyboard: ←/→ navigate, Space flip, "s" shuffle, "t" toggle shuffle-on-load
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.code === "Space") { e.preventDefault(); flip(); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); shuffleNow(); }
      else if (e.key.toLowerCase() === "t") { e.preventDefault(); setShuffleOnLoad((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, flip, shuffleNow]);

  // Helpers to change deck from the UI
  const [deckInput, setDeckInput] = useState<string>(() => deck);
  useEffect(() => setDeckInput(deck), [deck]);
  const applyDeck = useCallback(() => {
    const d = deckInput.trim() || "GLOBAL";
    // update URL (?deck=...)
    try {
      const url = new URL(window.location.href);
      if (d.toUpperCase() === "GLOBAL") url.searchParams.delete("deck");
      else url.searchParams.set("deck", d);
      window.history.replaceState(null, "", url.toString());
    } catch {}
    setDeck(d);
  }, [deckInput]);

  const c = cards[idx];

  if (!cards.length) {
    return (
      <>
        <Head><title>Flashcards • MyABA</title></Head>
        <main className="mx-auto max-w-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Flashcards</h1>
            <div className="text-sm text-zinc-500">0 / 0</div>
          </div>

          {/* Deck control even when empty */}
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm text-zinc-700">Deck:</label>
            <input
              value={deckInput}
              onChange={(e) => setDeckInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyDeck()}
              placeholder="GLOBAL"
              className="rounded border px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={applyDeck}
              className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50"
              disabled={loading}
            >
              {loading ? "Loading…" : "Load"}
            </button>
          </div>

          <p className="text-sm text-zinc-600">{msg}</p>
        </main>
      </>
    );
  }

  // Button wrappers to prevent bubbling to card click
  const onPrevClick: React.MouseEventHandler<HTMLButtonElement> = (e) => { e.preventDefault(); e.stopPropagation(); prev(); };
  const onNextClick: React.MouseEventHandler<HTMLButtonElement> = (e) => { e.preventDefault(); e.stopPropagation(); next(); };
  const onFlipClick: React.MouseEventHandler<HTMLButtonElement> = (e) => { e.preventDefault(); e.stopPropagation(); flip(); };
  const onShuffleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => { e.preventDefault(); e.stopPropagation(); shuffleNow(); };

  return (
    <>
      <Head>
        <title>Flashcards • MyABA</title>
        <meta name="description" content="Study your flashcards with flip, shuffle, and keyboard navigation." />
      </Head>

      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Flashcards</h1>
          <div className="text-sm text-zinc-500">
            Card <span className="font-medium text-zinc-800">{idx + 1}</span> / {cards.length}
          </div>
        </div>

        {/* Deck + shuffle controls */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-700">Deck:</label>
            <input
              value={deckInput}
              onChange={(e) => setDeckInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyDeck()}
              placeholder="GLOBAL"
              className="rounded border px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={applyDeck}
              className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50"
              disabled={loading}
            >
              {loading ? "Loading…" : "Load"}
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 ml-auto">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={shuffleOnLoad}
              onChange={(e) => setShuffleOnLoad(e.target.checked)}
              aria-label="Shuffle on load"
              title="Toggle shuffle on load (T)"
            />
            Shuffle on load
          </label>
        </div>

        <div className="mb-2 text-xs text-zinc-500">{msg}</div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={onPrevClick} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition">
            Prev
          </button>
          <button type="button" onClick={onFlipClick} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition">
            {showDef ? "Show Term" : "Show Definition"}
          </button>
          <button type="button" onClick={onNextClick} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition">
            Next
          </button>
          <button type="button" onClick={onShuffleClick} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition" title="Shuffle deck (S)">
            Shuffle 🔀
          </button>
        </div>

        {/* Clickable card */}
        <article
          role="button"
          tabIndex={0}
          onClick={() => flip()}
          onKeyDown={(e) => { if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); flip(); } }}
          aria-pressed={showDef}
          className="cursor-pointer select-none rounded-2xl border bg-white p-6 shadow-sm transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <h2 className="m-0 text-lg font-medium text-zinc-900">
            {showDef ? (c.definition ?? <em>No definition</em>) : (c.term ?? "(no term)")}
          </h2>
          <p className="mt-2 text-zinc-600">
            {showDef ? "Definition" : "Term"} • Click or press Space to flip
          </p>
        </article>
      </main>
    </>
  );
}
