// utils/quizToc.ts
export type Subdomain = { code: string; title: string };
export type Section = { id: string; title: string; icon?: string; items: Subdomain[] };

export const QUIZ_SECTIONS: Section[] = [
  {
    id: "A",
    title: "Behaviorism and Philosophical Foundations",
    icon: "🧠",
    items: [
      { code: "A1", title: "Identify the goals of behavior analysis as a science" },
      { code: "A2", title: "Explain the philosophical assumptions" },
      { code: "A3", title: "Explain behavior from radical behaviorism" },
      { code: "A4", title: "Distinguish among behaviorism/EAB/ABA/practice" },
      { code: "A5", title: "Distinguish empirical vs mentalistic explanations" },
      { code: "A6", title: "Explain selectionism" },
      { code: "A7", title: "Explain determinism, empiricism, parsimony" },
      { code: "A8", title: "Explain pragmatism" },
      { code: "A9", title: "Differentiate structural vs functional approaches" },
      { code: "A10", title: "Explain the concept of private events" },
    ],
  },
  {
    id: "B",
    title: "Concepts and Principles",
    icon: "📈",
    items: [
      { code: "B1", title: "Behavior, response, response class" },
      { code: "B2", title: "Stimulus, stimulus class" },
      { code: "B3", title: "Respondent conditioning" },
      { code: "B4", title: "Operant conditioning" },
      { code: "B5", title: "Positive/negative reinforcement" },
      { code: "B6", title: "Schedules of reinforcement" },
      { code: "B7", title: "Extinction" },
      { code: "B8", title: "Punishment" },
      { code: "B9", title: "Motivating operations" },
      { code: "B10", title: "Stimulus control, discrimination, generalization" },
    ],
  },
  {
    id: "C",
    title: "Measurement, Data Display, and Interpretation",
    icon: "✏️",
    items: [
      { code: "C1", title: "Measurement dimensions & procedures" },
      { code: "C2", title: "Graphical display" },
      { code: "C3", title: "Level, trend, variability" },
      { code: "C4", title: "IOA, treatment integrity" },
      { code: "C5", title: "Data interpretation & decisions" },
    ],
  },
  {
    id: "D",
    title: "Experimental Design",
    icon: "🧪",
    items: [
      { code: "D1", title: "Single-case logic" },
      { code: "D2", title: "Reversal design" },
      { code: "D3", title: "Multiple baseline" },
      { code: "D4", title: "Changing criterion" },
      { code: "D5", title: "Alternating treatments" },
      { code: "D6", title: "Parametric, component, & sequence" },
      { code: "D7", title: "Threats to internal validity" },
      { code: "D8", title: "External validity & generality" },
      { code: "D9", title: "Ethical experimentation" },
    ],
  },
  {
    id: "E",
    title: "Ethical and Professional Issues",
    icon: "🛡️",
    items: [
      { code: "E1", title: "BACB Ethics Code foundations" },
      { code: "E2", title: "Scope of competence & supervision" },
      { code: "E3", title: "Informed consent & assent" },
      { code: "E4", title: "Confidentiality & documentation" },
      { code: "E5", title: "Cultural responsiveness" },
      { code: "E6", title: "Risk-benefit and restraint" },
      { code: "E7", title: "Multiple relationships & conflicts" },
      { code: "E8", title: "Service termination & transitions" },
      { code: "E9", title: "Reporting & compliance" },
      { code: "E10", title: "Professional development" },
      { code: "E11", title: "Supervision responsibilities" },
      { code: "E12", title: "Organizational systems & OBM ethics" },
    ],
  },
  {
    id: "F",
    title: "Behavior Assessment",
    icon: "🔎",
    items: [
      { code: "F1", title: "Assessment foundations" },
      { code: "F2", title: "Indirect assessment" },
      { code: "F3", title: "Descriptive assessment" },
      { code: "F4", title: "Functional analysis" },
      { code: "F5", title: "Preference & reinforcer assessment" },
      { code: "F6", title: "Skill-based assessment" },
      { code: "F7", title: "Goal selection & social significance" },
      { code: "F8", title: "Stakeholder collaboration" },
    ],
  },
];

// --- localStorage helpers for progress/favorites ---
const SCORE_KEY = "quizScore:"; // e.g., quizScore:A1 -> "7/10"
const FAV_KEY = "quizFav:";     // e.g., quizFav:A1 -> "true"

export function getScore(code: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SCORE_KEY + code);
}
export function setScore(code: string, score: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCORE_KEY + code, score);
}
export function getFav(code: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FAV_KEY + code) === "true";
}
export function toggleFav(code: string): boolean {
  if (typeof window === "undefined") return false;
  const next = !getFav(code);
  localStorage.setItem(FAV_KEY + code, String(next));
  return next;
}

// Remaining count for a section = items without a score yet
export function remainingFor(sectionId: string): number {
  const sec = QUIZ_SECTIONS.find(s => s.id === sectionId);
  if (!sec) return 0;
  return sec.items.filter(i => !getScore(i.code)).length;
}

export function sectionProgressPercent(sectionId: string): number {
  const sec = QUIZ_SECTIONS.find(s => s.id === sectionId);
  if (!sec) return 0;
  const done = sec.items.filter(i => !!getScore(i.code)).length;
  return Math.round((done / sec.items.length) * 100);
}

export function overallProgressPercent(): number {
  const total = QUIZ_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = QUIZ_SECTIONS.reduce(
    (n, s) => n + s.items.filter(i => !!getScore(i.code)).length,
    0
  );
  return total ? Math.round((done / total) * 100) : 0;
}
