// lib/storage.ts
export type FlashCard = { term: string; def: string };
export type QuizItem = {
  domain?: string;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  answer: "A" | "B" | "C" | "D";
  rationale?: string;
};

const safe = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const loadFlashcards = () => safe<FlashCard[]>("safmeds:deck", []);
export const saveFlashcards = (arr: FlashCard[]) =>
  localStorage.setItem("safmeds:deck", JSON.stringify(arr));

export const loadQuiz = () => safe<QuizItem[]>("quiz:deck", []);
export const saveQuiz = (arr: QuizItem[]) =>
  localStorage.setItem("quiz:deck", JSON.stringify(arr));

export type SafMedsTrial = { timestamp: number; correct: number; errors: number; secs: number };
export const loadSafMedsTrials = () => safe<SafMedsTrial[]>("safmeds:trials", []);
export const saveSafMedsTrials = (arr: SafMedsTrial[]) =>
  localStorage.setItem("safmeds:trials", JSON.stringify(arr));
