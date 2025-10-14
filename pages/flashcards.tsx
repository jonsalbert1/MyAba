import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';

type Card = {
  id: string;
  term?: string | null;
  definition?: string | null;
  deck?: string | null;
  created_at?: string | null;
};

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [showDef, setShowDef] = useState(false);
  const [msg, setMsg] = useState('loading…');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/flashcards');
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'API error');
        setCards(j.data || []);
        setMsg(`loaded ${j.data?.length ?? 0} cards`);
      } catch (e: any) {
        setMsg(`fetch error: ${e.message}`);
      }
    })();
  }, []);

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

  // Keyboard shortcuts: ←/→ navigate, Space flips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.code === 'Space') { e.preventDefault(); flip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, flip]);

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

  return (
    <>
      <Head>
        <title>Flashcards • MyABA</title>
        <meta name="description" content="Study your flashcards with flip and keyboard navigation." />
      </Head>

      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Flashcards</h1>
          <div className="text-sm text-zinc-500">
            Card <span className="font-medium text-zinc-800">{idx + 1}</span> / {cards.length}
          </div>
        </div>

        <div className="mb-5 flex gap-2">
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
            {showDef ? 'Show Term' : 'Show Definition'}
          </button>
          <button
            type="button"
            onClick={onNextClick}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50 active:scale-[0.99] transition"
          >
            Next
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
