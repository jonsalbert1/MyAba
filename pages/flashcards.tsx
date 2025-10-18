import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';

type Card = {
  id: string;
  term?: string | null;
  definition?: string | null;
  deck?: string | null;
  created_at?: string | null;
};

// Fisher–Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STORAGE_KEY = 'flashcards_shuffle_on_load';

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [showDef, setShowDef] = useState(false);
  const [msg, setMsg] = useState('loading…');
  const [shuffleOnLoad, setShuffleOnLoad] = useState<boolean>(true);

  // Load user pref from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw !== null) setShuffleOnLoad(raw === 'true');
    } catch {}
  }, []);

  // Persist user pref
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(shuffleOnLoad));
    } catch {}
  }, [shuffleOnLoad]);

  // Fetch cards (and maybe shuffle on load)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/flashcards');
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'API error');
        const data: Card[] = Array.isArray(j.data) ? j.data : [];
        const deck = shuffleOnLoad ? shuffleArray(data) : data;
        setCards(deck);
        setMsg(`loaded ${data.length} cards${shuffleOnLoad ? ' (shuffled)' : ''}`);
        setIdx(0);
        setShowDef(false);
      } catch (e: any) {
        setMsg(`fetch error: ${e.message}`);
      }
    })();
  }, [shuffleOnLoad]); // refetch/reshuffle when the preference changes

  useEffect(() => {
    if (!cards.length) { setIdx(0); setShowDef(false); return; }
    setIdx(i => Math.min(i, cards.length - 1));
    setShowDef(false);
  }, [cards.length]);

  useEffect(() => { setShowDef(false); }, [idx]);

  const next = useCallback(() => {
    if (!cards.length) return;
    setIdx(i => (i + 1) % cards.length);
  }, [cards.length]);

  const prev = useCallback(() => {
    if (!cards.length) return;
    setIdx(i => (i - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const flip = useCallback(() => setShowDef(s => !s), []);

  const shuffleNow = useCallback(() => {
    if (!cards.length) return;
    setCards(prev => shuffleArray(prev));
    setIdx(0);
    setShowDef(false);
    setMsg(`shuffled ${cards.length} cards`);
  }, [cards.length]);

  // Keyboard: ←/→ navigate, Space flip, "s" shuffle, "t" toggle shuffle-on-load
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.code === 'Space') { e.preventDefault(); flip(); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); shuffleNow(); }
      else if (e.key.toLowerCase() === 't') { e.preventDefault(); setShuffleOnLoad(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, flip, shuffleNow]);

  if (!cards.length) {
    return (
      <>
        <Head><title>Flashcards • MyABA</title></Head>
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-sm text-zinc-600">{msg}</p>
        </main>
      </>
    );
  }

  const c = cards[idx];

  // Button wrappers that stop bubbling to the card click
  const onPrevClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); prev();
  };
  const onNextClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); next();
  };
  const onFlipClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); flip();
  };
  const onShuffleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); shuffleNow();
  };

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

        <div className="mb-3 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
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
          <span className="text-xs text-zinc-500">(press “T” to toggle)</span>
        </div>

        <div className="mb-2 text-xs text-zinc-500">{msg}</div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrevClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
            aria-label="Previous card (Left Arrow)"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onFlipClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
            aria-label="Flip card (Space)"
          >
            {showDef ? 'Show Term' : 'Show Definition'}
          </button>
          <button
            type="button"
            onClick={onNextClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
            aria-label="Next card (Right Arrow)"
          >
            Next
          </button>
          <button
            type="button"
            onClick={onShuffleClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
            aria-label="Shuffle deck (S)"
            title="Shuffle deck (S)"
          >
            Shuffle 🔀
          </button>
        </div>

        {/* Clickable card (only this area flips) */}
        <article
          role="button"
          tabIndex={0}
          onClick={() => flip()}
          onKeyDown={(e) => {
            if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flip(); }
          }}
          aria-pressed={showDef}
          className="cursor-pointer select-none rounded-2xl border bg-white p-6 shadow-sm transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <h2 className="m-0 text-lg font-medium text-zinc-900">
            {showDef ? (c.definition ?? <em>No definition</em>) : (c.term ?? '(no term)')}
          </h2>
          <p className="mt-2 text-zinc-600">
            {showDef ? 'Definition' : 'Term'} • Click or press Space to flip
          </p>
        </article>
      </main>
    </>
  );
}
