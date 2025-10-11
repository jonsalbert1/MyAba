// pages/flashcards.tsx
import { useEffect, useState } from "react";
import Head from "next/head";

type Card = { id?: number; term: string; def: string };

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = cards[index];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/aba/flashcards");
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) setCards(json.data);
      } catch {}
    })();
  }, []);

  const next = () => {
    setFlipped(false);
    setIndex(i => (cards.length ? (i + 1) % cards.length : 0));
  };

  return (
    <>
      <Head><title>myABA | Flashcards</title></Head>
      <main className="min-h-screen px-6 py-8">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-4">Flashcards</h1>

        {!current ? (
          <p className="text-gray-600">Loading deck…</p>
        ) : (
          <div
            onClick={() => setFlipped(f => !f)}
            className="cursor-pointer bg-white rounded-2xl shadow p-8 max-w-2xl"
          >
            <div className="text-sm text-gray-500 mb-2">
              Card {index + 1} / {cards.length}
            </div>
            <div className="text-2xl">{flipped ? current.def : current.term}</div>
            <div className="mt-3 text-xs text-gray-500">(click card to flip)</div>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={next}
            className="bg-blue-900 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-800"
          >
            Next
          </button>
        </div>
      </main>
    </>
  );
}
