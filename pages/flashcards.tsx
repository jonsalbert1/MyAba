// pages/flashcards.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type Card = {
  id?: string;
  term: string;
  definition: string;
  domain?: string | null;
  deck?: string | null;
  created_at?: string;
};

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // fetch cards
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`/api/flashcards?limit=500`);
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "Failed to load cards");

        // ensure types & remove empties
        const raw: unknown[] = Array.isArray(j.data) ? j.data : [];
        const list: Card[] = raw
          .map((row: any): Card => ({
            id: row.id,
            term: String(row.term ?? "").trim(),
            definition: String(row.definition ?? "").trim(),
            domain: row.domain ?? null,
            deck: row.deck ?? null,
            created_at: row.created_at,
          }))
          .filter((c: Card) => c.term.length > 0 && c.definition.length > 0);

        if (!alive) return;
        setCards(list);
        setIdx(0);
        setFlipped(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Load error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const current = cards[idx] as Card | undefined;
  const count = cards.length;

  function nextCard() {
    setIdx((i) => (count === 0 ? 0 : (i + 1) % count));
    setFlipped(false);
  }
  function prevCard() {
    setIdx((i) => (count === 0 ? 0 : (i - 1 + count) % count));
    setFlipped(false);
  }
  function flip() {
    if (current) setFlipped((f) => !f);
  }

  // keyboard helpers
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") { e.preventDefault(); flip(); }
      else if (e.key === "ArrowRight") nextCard();
      else if (e.key === "ArrowLeft") prevCard();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, current]);

  const subtitle = useMemo(() => {
    if (!current) return "";
    const deck = current.deck ?? "GLOBAL";
    const dom = current.domain ?? "";
    return dom ? `${deck} · ${dom}` : deck;
  }, [current]);

  return (
    <>
      <Head><title>MyABA | Flashcards</title></Head>
      <main className="page">
        <h1 className="text-2xl font-semibold mb-3">Flashcards</h1>

        {loading && <div className="rounded-xl border border-slate-200 bg-white p-4">Loading…</div>}
        {err && !loading && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            {err}
          </div>
        )}

        {!loading && !err && (
          <>
            {!current ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-slate-700">No cards yet.</div>
                <div className="text-sm text-slate-500 mt-1">
                  Try uploading CSV on the <a className="underline" href="/admin">Admin</a> page.
                </div>
              </div>
            ) : (
              <>
                {/* Card */}
                <div
                  className={`card-surface relative preserve-3d`}
                  style={{
                    perspective: 1000,
                  }}
                >
                  {/* shared base styles for both faces */}
                  <div
                    className={`absolute inset-0 rounded-2xl shadow bg-white border border-slate-200 p-6 transition-transform duration-300 backface-hidden`}
                    style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                    onClick={flip}
                    role="button"
                    aria-label="flip card"
                  >
                    <div className="text-xs text-slate-500">{subtitle}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 select-none">
                      {current.term}
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center text-slate-400 text-sm">
                      Click / Space to flip
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 rounded-2xl shadow bg-white border border-slate-200 p-6 transition-transform duration-300 backface-hidden rotate-y-180`}
                    style={{ transform: flipped ? "rotateY(0deg)" : "rotateY(-180deg)" }}
                    onClick={flip}
                    role="button"
                    aria-label="flip card"
                  >
                    <div className="text-xs text-slate-500">{subtitle}</div>
                    <div className="mt-2 text-xl text-slate-800 leading-relaxed whitespace-pre-wrap select-none">
                      {current.definition}
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center text-slate-400 text-sm">
                      Click / Space to flip back
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={prevCard}
                    className="rounded-lg border px-3 py-2 bg-white border-slate-200 hover:border-slate-300"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={flip}
                    className="rounded-lg border px-3 py-2 bg-white border-slate-200 hover:border-slate-300"
                  >
                    Flip
                  </button>
                  <button
                    onClick={nextCard}
                    className="rounded-lg border px-3 py-2 bg-white border-slate-200 hover:border-slate-300"
                  >
                    Next →
                  </button>

                  <div className="ml-auto text-sm text-slate-600">
                    {idx + 1} / {count}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
