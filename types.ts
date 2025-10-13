export type Card = {
  id: string;
  term: string;
  definition: string;
};

export type QuizItem = {
  id: string;
  domain: string;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  answer: "A" | "B" | "C" | "D";
  rationale: string;
};
