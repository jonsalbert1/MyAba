// pages/flashcards.tsx
import Head from "next/head";
import { useEffect, useState, useCallback } from "react";

type Card = {
  id: string;
  term?: string | null;
  definition?: string | null;
  deck?: string | null;
  created_at?: string | null;
  class_code?: string | null;
  deck_number?: number | null;
  domain?: string | null;
  subdomain?: string | null;
};

// ---------- helper: fetch cards from /api/flashcards ----------
async function fetchCards(params: {
  class_code?: string;
  deck_number?: number;
  domain?: string;
  code?: string;
}) {
  const p = new URLSearchParams();
  if (params.class_code) p.set("class_code", params.class_code);
  if (typeof params.deck_number === "number") {
    p.set("deck_number", String(params.deck_number));
  }
  if (params.domain) p.set("domain", params.domain);
  if (params.code) p.set("code", params.code);

  const resp = await fetch(`/api/flashcards?${p.toString()}`, { cache: "no-store" });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json();

  if (Array.isArray(json?.cards)) {
    return json.cards as Card[];
  }
  if (json?.ok && Array.isArray(json?.cards)) {
    return json.cards as Card[];
  }
  if (Array.isArray(json?.data)) {
    return json.data as Card[];
  }

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
  // start with no class selected; we'll auto-pick the first from meta
  const [classCode, setClassCode] = useState<string>("");
  const [deckNum, setDeckNum] = useState<number>(1);

  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [showDef, setShowDef] = useState(false);
  const [msg, setMsg] = useState("loading…");
  const [shuffleOnLoad, setShuffleOnLoad] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // options for dropdowns
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [deckNumOptions, setDeckNumOptions] = useState<number[]>([1]);

  // selected values in controls (mirrors state)
  const [classInput, setClassInput] = useState<string>(() => classCode);
  const [deckNumInput, setDeckNumInput] = useState<string>(() => String(deckNum));

  useEffect(() => setClassInput(classCode), [classCode]);
  useEffect(() => setDeckNumInput(String(deckNum)), [deckNum]);

  // Load shuffle preference
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw !== null) setShuffleOnLoad(raw === "true");
    } catch {}
  }, []);

  // Persist shuffle preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(shuffleOnLoad));
    } catch {}
  }, [shuffleOnLoad]);

  // 🔹 Fetch meta for dropdowns (class_code + deck_number)
  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const resp = await fetch("/api/flashcards/meta", { cache: "no-store" });
        if (!resp.ok) return;
        const json = await resp.json();
        if (cancelled) return;

        const classesFromDb: string[] = Array.isArray(json.class_codes)
          ? json.class_codes.filter(
              (x: any) =>
                typeof x === "string" &&
                x.trim() !== "" &&
                x.trim().toUpperCase() !== "DEFAULT"
            )
          : [];

        const deckNumsFromDb: number[] = Array.isArray(json.deck_numbers)
          ? json.deck_numbers.filter((x: any) => typeof x === "number")
          : [];

        // Class options: DB values + current selection (if not DEFAULT)
        setClassOptions(() => {
          const clean: string[] = [...classesFromDb];
          if (classCode && classCode.trim().toUpperCase() !== "DEFAULT") {
            clean.push(classCode);
          }
          return Array.from(new Set(clean)).sort();
        });

        // Deck # options
        setDeckNumOptions((prev) => {
          const set = new Set(prev);
          deckNumsFromDb.forEach((n) => set.add(n));
          if (deckNum) set.add(deckNum);
          if (!set.has(1)) set.add(1);
          return Array.from(set).sort((a, b) => a - b);
        });
      } catch {
        // silently ignore and keep defaults
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [classCode, deckNum]);

  // After classOptions load, if no class selected yet, pick the first
  useEffect(() => {
    if (!classCode && classOptions.length > 0) {
      setClassCode(classOptions[0]);
    }
  }, [classCode, classOptions]);

  // Fetch cards
  const load = useCallback(
    async (classCodeValue: string, deckNumValue: number) => {
      setLoading(true);
      try {
        const effectiveClass = classCodeValue || "";
        const data = await fetchCards({
          class_code: effectiveClass || undefined,
          deck_number: deckNumValue || 1,
        });
        const final = shuffleOnLoad ? shuffleArray(data) : data;
        setCards(final);
        setMsg(
          `loaded ${data.length} cards${
            shuffleOnLoad ? " (shuffled)" : ""
          } [class=${effectiveClass || "—"}, deck_num=${deckNumValue || 1}]`
        );
        setIdx(0);
        setShowDef(false);
      } catch (e: any) {
        setCards([]);
        setMsg(`fetch error: ${e?.message ?? "unknown error"}`);
      } finally {
        setLoading(false);
      }
    },
    [shuffleOnLoad]
  );

  // Load on mount and when class/deckNum/shuffle pref changes
  useEffect(() => {
    load(classCode, deckNum);
  }, [classCode, deckNum, shuffleOnLoad, load]);

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

  useEffect(() => {
    setShowDef(false);
  }, [idx]);

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
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.code === "Space") {
        e.preventDefault();
        flip();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        shuffleNow();
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setShuffleOnLoad((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, flip, shuffleNow]);

  // Apply class + deckNum from controls
  const applyFilters = useCallback(() => {
    const c = classInput.trim() || (classOptions[0] ?? "");
    let n = parseInt(deckNumInput.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) n = 1;

    setClassCode(c);
    setDeckNum(n);
  }, [classInput, deckNumInput, classOptions]);

  const c = cards[idx];

  if (!cards.length) {
    return (
      <>
        <Head>
          <title>Flashcards • MyABA</title>
        </Head>
        <main className="mx-auto max-w-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Flashcards</h1>
            <div className="text-sm text-zinc-500">0 / 0</div>
          </div>

          {/* Class & deckNum controls even when empty */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-700">Class:</label>
              <select
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              >
                {classOptions.length === 0 ? (
                  <option value="">(no classes)</option>
                ) : (
                  classOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-700">Deck #:</label>
              <select
                value={deckNumInput}
                onChange={(e) => setDeckNumInput(e.target.value)}
                className="w-20 rounded border px-2 py-1 text-sm"
              >
                {deckNumOptions.map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={applyFilters}
                className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50"
                disabled={loading}
              >
                {loading ? "Loading…" : "Load"}
              </button>
            </div>
          </div>

          <p className="text-sm text-zinc-600">{msg}</p>
        </main>
      </>
    );
  }

  // Button wrappers to prevent bubbling to card click
  const onPrevClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    prev();
  };
  const onNextClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    next();
  };
  const onFlipClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    flip();
  };
  const onShuffleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    shuffleNow();
  };

  return (
    <>
      <Head>
        <title>Flashcards • MyABA</title>
        <meta
          name="description"
          content="Study your flashcards with flip, shuffle, and keyboard navigation."
        />
      </Head>

      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Flashcards</h1>
            <p className="text-xs text-zinc-500">
              Class:{" "}
              <span className="font-medium">{classCode || "—"}</span> • Deck #:{" "}
              <span className="font-medium">{deckNum}</span>
            </p>
          </div>
          <div className="text-sm text-zinc-500">
            Card <span className="font-medium text-zinc-800">{idx + 1}</span> /{" "}
            {cards.length}
          </div>
        </div>

        {/* Class + deckNum + shuffle controls */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-700">Class:</label>
            <select
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              {classOptions.length === 0 ? (
                <option value="">(no classes)</option>
              ) : (
                classOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-700">Deck #:</label>
            <select
              value={deckNumInput}
              onChange={(e) => setDeckNumInput(e.target.value)}
              className="w-20 rounded border px-2 py-1 text-sm"
            >
              {deckNumOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={applyFilters}
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
          <button
            type="button"
            onClick={onPrevClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onFlipClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
          >
            {showDef ? "Show Term" : "Show Definition"}
          </button>
          <button
            type="button"
            onClick={onNextClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
          >
            Next
          </button>
          <button
            type="button"
            onClick={onShuffleClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
            title="Shuffle deck (S)"
          >
            Shuffle 🔀
          </button>
        </div>

        {/* Clickable square flip card */}
        <div className="w-full flex justify-center items-center mt-6">
          <div
            onClick={() => flip()}
            onKeyDown={(e) => {
              if (e.code === "Space" || e.key === "Enter") {
                e.preventDefault();
                flip();
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={showDef}
            className={`
              relative
              aspect-square
              w-[90vw] max-w-[380px] sm:max-w-[420px] lg:max-w-[480px]
              cursor-pointer select-none
              perspective-1200
            `}
          >
            <div
              className={`
                relative w-full h-full
                preserve-3d
                transition-transform duration-500
                ${showDef ? "rotate-y-180" : ""}
              `}
            >
              {/* FRONT: term */}
              <div
                className="
                  absolute inset-0
                  backface-hidden
                  rounded-2xl border bg-white p-6 shadow
                  flex items-center justify-center text-center
                "
              >
                <h2 className="text-lg font-medium text-zinc-900">
                  {c.term ?? "(no term)"}
                </h2>
              </div>

              {/* BACK: definition */}
              <div
                className="
                  absolute inset-0
                  backface-hidden rotate-y-180
                  rounded-2xl border bg-white p-6 shadow
                  flex items-center justify-center text-center
                "
              >
                <h2 className="text-lg font-medium text-zinc-900">
                  {c.definition ?? <em>No definition</em>}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
