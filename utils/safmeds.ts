// utils/safmeds.ts
export type Session = {
  id: string;
  deck: string | null;
  correct: number;
  incorrect: number;
  duration_seconds: number;
  run_started_at: string; // ISO
  notes?: string | null;
};

const TZ = "America/Los_Angeles";

/** Returns YYYY-MM-DD in America/Los_Angeles */
export function dateKeyLocal(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // "YYYY-MM-DD"
  return fmt.format(d);
}

/** Score you want to optimize for. You can change this rule if you prefer. */
function scoreOf(s: Session) {
  // net score, break ties by higher correct, then shorter duration
  return {
    primary: s.correct - s.incorrect,
    secondary: s.correct,
    tertiary: -s.duration_seconds, // negative so smaller duration wins
  };
}

/** Choose the "better" of two sessions */
function better(a: Session, b: Session) {
  const sa = scoreOf(a);
  const sb = scoreOf(b);
  if (sa.primary !== sb.primary) return sa.primary > sb.primary ? a : b;
  if (sa.secondary !== sb.secondary) return sa.secondary > sb.secondary ? a : b;
  if (sa.tertiary !== sb.tertiary) return sa.tertiary > sb.tertiary ? a : b;
  return a; // stable
}

/** Map YYYY-MM-DD -> best session */
export function bestOfDayMap(sessions: Session[]) {
  const byDay = new Map<string, Session>();
  for (const s of sessions) {
    const key = dateKeyLocal(s.run_started_at);
    const prev = byDay.get(key);
    if (!prev) byDay.set(key, s);
    else byDay.set(key, better(prev, s));
  }
  return byDay;
}

/** Array sorted by date asc, for charts */
export function bestOfDaySeries(sessions: Session[]) {
  const m = bestOfDayMap(sessions);
  return [...m.entries()]
    .map(([day, s]) => ({
      day,                                // YYYY-MM-DD
      net: s.correct - s.incorrect,       // chart y-value (change if you prefer)
      correct: s.correct,
      incorrect: s.incorrect,
      duration: s.duration_seconds,
      sessionId: s.id,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
