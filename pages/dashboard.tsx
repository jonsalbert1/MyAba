// pages/dashboard.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Stat = { total: number; correct: number };
type StatMap = Record<string, Stat>;

const DOMAINS = [
  {
    letter: "A",
    name: "Behaviorism and Philosophical Foundations",
    subs: [
      { code: "A1", title: "Identify the goals of behavior analysis as a science (i.e., description, prediction, control)." },
      { code: "A2", title: "Explain the philosophical assumptions underlying the science of behavior analysis (e.g., selectionism, determinism, empiricism, parsimony, pragmatism)." },
      { code: "A3", title: "Explain behavior from the perspective of radical behaviorism." },
      { code: "A4", title: "Distinguish among behaviorism, the experimental analysis of behavior, applied behavior analysis, and professional practice guided by the science of behavior analysis." },
      { code: "A5", title: "Identify and describe dimensions of applied behavior analysis." },
    ],
  },
  {
    letter: "B",
    name: "Concepts and Principles",
    subs: [
      { code: "B1", title: "Identify and distinguish among behavior, response, and response class." },
      { code: "B2", title: "Identify and distinguish between stimulus and stimulus class." },
      { code: "B3", title: "Identify and distinguish between respondent and operant conditioning." },
      { code: "B4", title: "Identify and distinguish between positive and negative reinforcement contingencies." },
      { code: "B5", title: "Identify and distinguish between positive and negative punishment contingencies." },
      { code: "B6", title: "Identify and distinguish between automatic and socially mediated contingencies." },
      { code: "B7", title: "Identify and distinguish among unconditioned, conditioned, and generalized reinforcers." },
      { code: "B8", title: "Identify and distinguish among unconditioned, conditioned, and generalized punishers." },
      { code: "B9", title: "Identify and distinguish among simple schedules of reinforcement." },
      { code: "B10", title: "Identify and distinguish among concurrent, multiple, mixed, and chained schedules of reinforcement." },
      { code: "B11", title: "Identify and distinguish between operant and respondent extinction as operations and processes." },
      { code: "B12", title: "Identify examples of stimulus control." },
      { code: "B13", title: "Identify examples of stimulus discrimination." },
      { code: "B14", title: "Identify and distinguish between stimulus and response generalization." },
      { code: "B15", title: "Identify examples of response maintenance." },
      { code: "B16", title: "Identify examples of motivating operations." },
      { code: "B17", title: "Distinguish between motivating operations and stimulus control." },
      { code: "B18", title: "Identify and distinguish between rule-governed and contingency-shaped behavior." },
      { code: "B19", title: "Identify and distinguish among verbal operants." },
      { code: "B20", title: "Identify the role of multiple control in verbal behavior." },
      { code: "B21", title: "Identify examples of processes that promote emergent relations and generative performance." },
      { code: "B22", title: "Identify ways behavioral momentum can be used to understand response persistence." },
      { code: "B23", title: "Identify ways the matching law can be used to interpret response allocation." },
      { code: "B24", title: "Identify and distinguish between imitation and observational learning." },
    ],
  },
  {
    letter: "C",
    name: "Measurement, Data Display, and Interpretation",
    subs: [
      { code: "C1", title: "Create operational definitions of behavior." },
      { code: "C2", title: "Distinguish among direct, indirect, and product measures of behavior." },
      { code: "C3", title: "Measure occurrence." },
      { code: "C4", title: "Measure temporal dimensions of behavior (e.g., duration, latency, interresponse time)." },
      { code: "C5", title: "Distinguish between continuous and discontinuous measurement procedures." },
      { code: "C6", title: "Design and apply discontinuous measurement procedures (e.g., interval recording, time sampling)." },
      { code: "C7", title: "Measure efficiency (e.g., trials to criterion, cost-benefit analysis, training duration)." },
      { code: "C8", title: "Evaluate the validity and reliability of measurement procedures." },
      { code: "C9", title: "Select a measurement procedure to obtain representative data that accounts for the critical dimension of the behavior and environmental constraints." },
      { code: "C10", title: "Graph data to communicate relevant quantitative relations (e.g., equal-interval graphs, bar graphs, cumulative records)." },
      { code: "C11", title: "Interpret graphed data." },
      { code: "C12", title: "Select a measurement procedure to obtain representative procedural integrity data that accounts for relevant dimensions (e.g., accuracy, dosage) and environmental constraints." },
    ],
  },
  {
    letter: "D",
    name: "Experimental Design",
    subs: [
      { code: "D1", title: "Distinguish between dependent and independent variables." },
      { code: "D2", title: "Distinguish between internal and external validity." },
      { code: "D3", title: "Identify threats to internal validity (e.g., history, maturation)." },
      { code: "D4", title: "Identify the defining features of single-case experimental designs (e.g., individuals serve as their own controls, repeated measures, prediction, verification, replication)." },
      { code: "D5", title: "Identify the relative strengths of single-case experimental designs and group designs." },
      { code: "D6", title: "Critique and interpret data from single-case experimental designs." },
      { code: "D7", title: "Distinguish among reversal, multiple-baseline, multielement, and changing-criterion designs." },
      { code: "D8", title: "Identify rationales for conducting comparative, component, and parametric analyses." },
      { code: "D9", title: "Apply single-case experimental designs." },
    ],
  },
  {
    letter: "E",
    name: "Ethical and Professional Issues",
    subs: [
      { code: "E1", title: "Identify and apply core principles underlying the ethics codes for BACB certificants (e.g., benefit others; treat others with compassion, dignity, and respect; behave with integrity)." },
      { code: "E2", title: "Identify the risks to oneself, others, and the profession as a result of engaging in unethical behavior." },
      { code: "E3", title: "Develop and maintain competence by engaging in professional development activities (e.g., read literature, seek consultation, establish mentors)." },
      { code: "E4", title: "Identify and comply with requirements for collecting, using, protecting, and disclosing confidential information." },
      { code: "E5", title: "Identify and comply with requirements for making public statements about professional activities (e.g., social media activity; misrepresentation of professional credentials, behavior analysis, and service outcomes)." },
      { code: "E6", title: "Identify the conditions under which services or supervision should be discontinued and apply steps that should be taken when transitioning clients and supervisees to another professional." },
      { code: "E7", title: "Identify types of and risks associated with multiple relationships, and how to mitigate those risks when they are unavoidable." },
      { code: "E8", title: "Identify and apply interpersonal and other skills (e.g., accepting feedback, listening actively, seeking input, collaborating) to establish and maintain professional relationships." },
      { code: "E9", title: "Engage in cultural humility in service delivery and professional relationships." },
      { code: "E10", title: "Apply culturally responsive and inclusive service and supervision activities." },
      { code: "E11", title: "Identify personal biases and how they might interfere with professional activity." },
      { code: "E12", title: "Identify and apply the legal, regulatory, and practice requirements (e.g., licensure, jurisprudence, funding, certification) relevant to the delivery of behavior-analytic services." },
    ],
  },
  {
    letter: "F",
    name: "Behavior Assessment",
    subs: [
      { code: "F1", title: "Identify relevant sources of information in records (e.g., educational, medical, historical) at the outset of the case." },
      { code: "F2", title: "Identify and integrate relevant cultural variables in the assessment process." },
      { code: "F3", title: "Design and evaluate assessments of relevant skill strengths and areas of need." },
      { code: "F4", title: "Design and evaluate preference assessments." },
      { code: "F5", title: "Design and evaluate descriptive assessments." },
      { code: "F6", title: "Design and evaluate functional analyses." },
      { code: "F7", title: "Interpret assessment data to determine the need for behavior-analytic services and/or referral to others." },
      { code: "F8", title: "Interpret assessment data to identify and prioritize socially significant, client-informed, and culturally responsive behavior-change procedures and goals." },
    ],
  },
  {
    letter: "G",
    name: "Behavior-Change Procedures",
    subs: [
      { code: "G1", title: "Design and evaluate positive and negative reinforcement procedures." },
      { code: "G2", title: "Design and evaluate differential reinforcement (e.g., DRA, DRO, DRL, DRH) procedures with and without extinction." },
      { code: "G3", title: "Design and evaluate time-based reinforcement (e.g., fixed-time) schedules." },
      { code: "G4", title: "Identify procedures to establish and use conditioned reinforcers (e.g., token economies)." },
      { code: "G5", title: "Incorporate motivating operations and discriminative stimuli into behavior-change procedures." },
      { code: "G6", title: "Design and evaluate procedures to produce simple and conditional discriminations." },
      { code: "G7", title: "Select and evaluate stimulus and response prompting procedures (e.g., errorless, most-to-least, least-to-most)." },
      { code: "G8", title: "Design and implement procedures to fade stimulus and response prompts (e.g., prompt delay, stimulus fading)." },
      { code: "G9", title: "Design and evaluate modeling procedures." },
      { code: "G10", title: "Design and evaluate instructions and rules." },
      { code: "G11", title: "Shape dimensions of behavior." },
      { code: "G12", title: "Select and implement chaining procedures." },
      { code: "G13", title: "Design and evaluate trial-based and free-operant procedures." },
      { code: "G14", title: "Design and evaluate group contingencies." },
      { code: "G15", title: "Design and evaluate procedures to promote stimulus and response generalization." },
      { code: "G16", title: "Design and evaluate procedures to maintain desired behavior change following intervention (e.g., schedule thinning, transferring to naturally occurring reinforcers)." },
      { code: "G17", title: "Design and evaluate positive and negative punishment (e.g., time-out, response cost, overcorrection)." },
      { code: "G18", title: "Evaluate emotional and elicited effects of behavior-change procedures." },
      { code: "G19", title: "Design and evaluate procedures to promote emergent relations and generative performance." },
    ],
  },
  {
    letter: "H",
    name: "Selecting and Implementing Interventions",
    subs: [
      { code: "H1", title: "Develop intervention goals in observable and measurable terms." },
      { code: "H2", title: "Identify and recommend interventions based on assessment results, scientific evidence, client preferences, and contextual fit (e.g., expertise required for implementation, cultural variables, environmental resources)." },
      { code: "H3", title: "Select socially valid alternative behavior to be established or increased when a target behavior is to be decreased." },
      { code: "H4", title: "Plan for and attempt to mitigate possible unwanted effects when using reinforcement, extinction, and punishment procedures." },
      { code: "H5", title: "Plan for and attempt to mitigate possible relapse of the target behavior." },
      { code: "H6", title: "Make data-based decisions about procedural integrity." },
      { code: "H7", title: "Make data-based decisions about the effectiveness of the intervention and the need for modification." },
      { code: "H8", title: "Collaborate with others to support and enhance client services." },
    ],
  },
  {
    letter: "I",
    name: "Personnel Supervision and Management",
    subs: [
      { code: "I1", title: "Identify the benefits of using behavior-analytic supervision (e.g., improved client outcomes, improved staff performance and retention)." },
      { code: "I2", title: "Identify and apply strategies for establishing effective supervisory relationships (e.g., executing supervisor–supervisee contracts, establishing clear expectations, giving and accepting feedback)." },
      { code: "I3", title: "Identify and implement methods that promote equity in supervision practices." },
      { code: "I4", title: "Select supervision goals based on an assessment of the supervisee’s skills, cultural variables, and the environment." },
      { code: "I5", title: "Identify and apply empirically validated and culturally responsive performance management procedures (e.g., modeling, practice, feedback, reinforcement, task clarification, manipulation of response effort)." },
      { code: "I6", title: "Apply a function-based approach (e.g., performance diagnostics) to assess and improve supervisee behavior." },
      { code: "I7", title: "Make data-based decisions about the efficacy of supervisory practices." },
    ],
  },
];

function getDomainFromCode(code: string) {
  // "B1" -> "B"
  return code.charAt(0).toUpperCase();
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatMap>({});
  const [loading, setLoading] = useState(true);

  // Invisible prefetch for snappier quiz start
  useEffect(() => {
    DOMAINS.forEach((d) => {
      d.subs.forEach((s) => {
        fetch(`/api/quiz?code=${encodeURIComponent(s.code)}&limit=10`).catch(() => {});
      });
    });
  }, []);

  // Optional: load per-subdomain progress if your view/table exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const map: StatMap = {};
      try {
        const { data, error } = await supabase
          .from("v_subdomain_stats")
          .select("subdomain,total,correct");

        if (error) throw error;
        if (data) {
          for (const row of data as any[]) {
            map[row.subdomain] = { total: row.total ?? 0, correct: row.correct ?? 0 };
          }
        }
      } catch {
        // fallback zeros if view not present yet
        DOMAINS.forEach((d) => d.subs.forEach((s) => (map[s.code] = { total: 0, correct: 0 })));
      }
      if (!cancelled) {
        setStats(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Head><title>myABA | Quiz Dashboard</title></Head>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-blue-900">Quiz Dashboard</h1>
        <p className="mt-2 text-gray-600">Select any subdomain to begin practicing quiz questions.</p>

        <div className="mt-6 space-y-8">
          {DOMAINS.map((domain) => (
            <section key={domain.letter}>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                {domain.letter}. {domain.name}
              </h2>
              <ul className="space-y-2">
                {domain.subs.map((s) => {
                  const st = stats[s.code] ?? { total: 0, correct: 0 };
                  const pct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
                  const letter = getDomainFromCode(s.code);
                  return (
                    <li key={s.code} className="flex flex-col md:flex-row md:items-center md:gap-3">
                      <Link
                        // Route to /quiz/[domain]/[code]
                        href={`/quiz/${letter}/${s.code}`}
                        className="text-blue-700 hover:underline"
                      >
                        <span className="font-semibold">{s.code}</span>{" "}
                        <span className="text-gray-800">{s.title}</span>
                      </Link>
                      <span className="md:ml-auto text-sm text-gray-600">
                        {loading ? "…" : `${st.correct}/${st.total} correct (${pct}%)`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
