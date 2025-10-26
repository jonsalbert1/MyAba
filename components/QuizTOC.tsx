// components/QuizTOC.tsx
import Link from "next/link";

/** Domain labels */
export const DOMAINS: Record<string, string> = {
  A: "Behaviorism and Philosophical Foundations",
  B: "Concepts and Principles",
  C: "Measurement, Data Display, and Interpretation",
  D: "Experimental Design",
  E: "Ethical and Professional Issues",
  F: "Behavior Assessment",
  G: "Behavior-Change Procedures",
  H: "Selecting and Implementing Interventions",
  I: "Personnel Supervision and Management",
};

/** How many subdomains per letter (BACB 6th) */
const SUBDOMAIN_COUNTS: Record<keyof typeof DOMAINS, number> = {
  A: 5,  B: 24,  C: 12,  D: 9,  E: 12,  F: 8,  G: 19,  H: 8,  I: 7,
};

/** Titles (fill out as you load them). Missing entries gracefully fall back to code-only. */
const TITLES: Record<string, string> = {
  A1: "Identify the goals of behavior analysis as a science (description, prediction, control).",
  A2: "Explain the philosophical assumptions (selectionism, determinism, empiricism, parsimony, pragmatism).",
  A3: "Explain behavior from the perspective of radical behaviorism.",
  A4: "Distinguish among behaviorism, EAB, ABA, and professional practice guided by the science of behavior analysis.",
  A5: "Identify and describe dimensions of applied behavior analysis.",
  // Add B1..B24, C1..C12, etc. as you go
};

function makeCodes(letter: keyof typeof DOMAINS) {
  return Array.from({ length: SUBDOMAIN_COUNTS[letter] }, (_, i) => `${letter}${i + 1}`);
}

type QuizTOCProps = {
  /** If true, shows each code on its own line with the description. If false, shows compact inline links. */
  showDescriptions?: boolean;
  /** Optional: basePath for links; defaults to '/quiz' → links like /quiz/A/A1 */
  basePath?: string;
};

export default function QuizTOC({ showDescriptions = false, basePath = "/quiz" }: QuizTOCProps) {
  return (
    <div className="space-y-10">
      {Object.keys(DOMAINS).map((letter) => {
        const L = letter as keyof typeof DOMAINS;
        const codes = makeCodes(L);
        return (
          <section key={L} className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {L}. {DOMAINS[L]}
            </h2>

            {showDescriptions ? (
              <ul className="space-y-2">
                {codes.map((code) => (
                  <li key={code} className="leading-relaxed">
                    <Link
                      href={`${basePath}/${L}/${code}`}
                      className="text-blue-700 hover:underline font-medium mr-2"
                    >
                      {code}
                    </Link>
                    <span className="text-gray-700">{TITLES[code] ?? ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {codes.map((code) => (
                  <Link
                    key={code}
                    href={`${basePath}/${L}/${code}`}
                    className="text-blue-800 underline underline-offset-2 hover:no-underline"
                  >
                    {code}
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
