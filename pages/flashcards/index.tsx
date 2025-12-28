// pages/flashcards/index.tsx
import { useEffect, useState } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import FlipCard from "@/components/FlipCard";

type DeckMeta = {
  class_code: string;
  deck_number: number;
};

type Card = {
  id: string;
  term: string;
  definition: string;
  class_code: string;
  deck_number: number;
};

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

export default function FlashcardsPage() {
  const user = useUser();
  const supabase = useSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [decks, setDecks] = useState<DeckMeta[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckMeta | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =========================
     A) Load profile (same as Home)
  ========================== */
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }
      try {
        setLoadingProfile(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Flashcards profile load error", error);
        }

        setProfile((data as Profile) ?? null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user, supabase]);

  const fullName =
    (profile?.first_name?.trim() || "") +
    (profile?.last_name ? ` ${profile.last_name.trim()}` : "");

  // Fallback if profile is missing
  const fallbackName = (() => {
    if (!user?.email) return "there";
    const local = user.email.split("@")[0] || "";
    const cleaned = local.replace(/[._-]+/g, " ");
    const parts = cleaned
      .split(" ")
      .filter(Boolean)
      .map(
        (part: string) =>
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      );
    return parts.length > 0 ? parts.join(" ") : "there";
  })();

  const displayName =
    fullName.trim().length > 0 ? fullName.trim() : fallbackName;

  /* =========================
     1) Load deck list on mount
  ========================== */
  useEffect(() => {
    const loadDecks = async () => {
      try {
        setLoadingDecks(true);
        setError(null);

        const res = await fetch("/api/flashcards/meta");
        const json = await res.json();

        if (!json.ok) {
          setError(json.error ?? "Failed to load decks");
          return;
        }
        if (json.mode !== "decks") {
          setError(`Unexpected mode from API: ${json.mode}`);
          return;
        }

        const decksFromApi = (json.decks || []) as DeckMeta[];
        setDecks(decksFromApi);

        // auto-select the first deck
        if (decksFromApi.length > 0) {
          setSelectedDeck(decksFromApi[0]);
        }
      } catch (e: any) {
        console.error("Error loading decks:", e);
        setError(e?.message ?? "Unknown error loading decks");
      } finally {
        setLoadingDecks(false);
      }
    };

    loadDecks();
  }, []);

  /* =========================
     2) Load cards when deck changes
  ========================== */
  useEffect(() => {
    const loadCards = async () => {
      if (!selectedDeck) return;

      try {
        setLoadingCards(true);
        setError(null);

        const { class_code, deck_number } = selectedDeck;

        const url = `/api/flashcards/meta?class_code=${encodeURIComponent(
          class_code
        )}&deck_number=${deck_number}`;

        console.log("Requesting cards with:", { class_code, deck_number, url });

        const res = await fetch(url);
        const json = await res.json();

        if (!json.ok) {
          setError(json.error ?? "Failed to load cards");
          return;
        }
        if (json.mode !== "cards") {
          setError(`Unexpected mode from API: ${json.mode}`);
          return;
        }

        const cardsFromApi = (json.data || []) as Card[];

        console.log(
          `loaded ${cardsFromApi.length} cards [class_code=${class_code}, deck_number=${deck_number}]`
        );

        setCards(cardsFromApi);
        setCurrentIndex(0);
        setFlipped(false);
      } catch (e: any) {
        console.error("Error loading cards:", e);
        setError(e?.message ?? "Unknown error loading cards");
      } finally {
        setLoadingCards(false);
      }
    };

    loadCards();
  }, [selectedDeck]);

  /* =========================
     3) Keyboard shortcuts
  ========================== */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((prev) => !prev);
        return;
      }

      if (e.key === "n" || e.key === "N" || e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => {
          if (cards.length === 0) return prev;
          const next = (prev + 1) % cards.length;
          return next;
        });
        setFlipped(false);
        return;
      }

      if (e.key === "p" || e.key === "P" || e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => {
          if (cards.length === 0) return prev;
          const next = (prev - 1 + cards.length) % cards.length;
          return next;
        });
        setFlipped(false);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length]);

  /* =========================
     4) Handlers
  ========================== */
  const handleDeckChange = (value: string) => {
    const [class_code, deck_number_str] = value.split("::");
    const deck_number = Number(deck_number_str);

    const found = decks.find(
      (d) => d.class_code === class_code && d.deck_number === deck_number
    );
    if (found) {
      setSelectedDeck(found);
    }
  };

  const handleFlipClick = () => {
    setFlipped((prev) => !prev);
  };

  const handleNext = () => {
    if (cards.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    setFlipped(false);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setFlipped(false);
  };

  const handleShuffle = () => {
    if (cards.length === 0) return;
    setCards((prev) => {
      const shuffled = [...prev].sort(() => Math.random() - 0.5);
      return shuffled;
    });
    setCurrentIndex(0);
    setFlipped(false);
  };

  const currentCard = cards.length > 0 ? cards[currentIndex] : null;

  /* =========================
     5) Render
  ========================== */
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-blue-900">
          Flashcards
        </h1>
        <p className="text-lg text-slate-700">
          Welcome, <span className="font-semibold">{displayName}</span>.
        </p>
        <p className="text-sm text-slate-600">
          Space = flip • N / → = next • P / ← = previous
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Deck selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">
          Select deck:
          <select
            className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            value={
              selectedDeck
                ? `${selectedDeck.class_code}::${selectedDeck.deck_number}`
                : ""
            }
            onChange={(e) => handleDeckChange(e.target.value)}
            disabled={loadingDecks || decks.length === 0}
          >
            {loadingDecks && <option>Loading decks…</option>}

            {!loadingDecks && decks.length === 0 && (
              <option>No decks found</option>
            )}

            {!loadingDecks &&
              decks.length > 0 &&
              decks.map((d) => (
                <option
                  key={`${d.class_code}::${d.deck_number}`}
                  value={`${d.class_code}::${d.deck_number}`}
                >
                  {d.class_code} — Deck {d.deck_number}
                </option>
              ))}
          </select>
        </label>

        {selectedDeck && cards.length > 0 && (
          <span className="text-sm text-slate-600">
            {selectedDeck.class_code} — Deck {selectedDeck.deck_number} • Card{" "}
            {currentIndex + 1} of {cards.length}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={handlePrev}
          disabled={cards.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
        >
          ← Previous (P)
        </button>
        <button
          type="button"
          onClick={handleFlipClick}
          disabled={!currentCard}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
        >
          Flip (Space)
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={cards.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
        >
          Next (N) →
        </button>
        <button
          type="button"
          onClick={handleShuffle}
          disabled={cards.length === 0}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
        >
          Shuffle Deck
        </button>
      </div>

      {/* Current card */}
      {loadingCards && (
        <div className="text-sm text-slate-600 mb-4">Loading cards…</div>
      )}

      {!loadingCards && !currentCard && (
        <div className="text-sm text-slate-600">
          {selectedDeck
            ? "No cards found for this deck."
            : "Select a deck to begin."}
        </div>
      )}

      {currentCard && (
        <div className="max-w-md mx-auto">
          <FlipCard
            flipped={flipped}
            onToggle={handleFlipClick}
            front={currentCard.term}
            back={currentCard.definition}
          />
        </div>
      )}
    </div>
  );
}
