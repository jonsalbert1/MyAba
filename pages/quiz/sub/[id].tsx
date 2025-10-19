// pages/quiz/sub/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Q = {
  id: string;
  prompt: string;
  statement?: string | null;
  a: string; b: string; c: string; d: string;
  correct: "a" | "b" | "c" | "d";
  rationale_correct?: string | null;
  rationale_a?: string | null;
  rationale_b?: string | null;
  rationale_c?: string | null;
  rationale_d?: string | null;
};

function extractSub(raw: string) {
  const m = String(raw || "").trim().toUpperCase().match(/^[A-I][0-9]{1,2}/);
  return m ? m[0] : String(raw || "").trim().toUpperCase();
}

export default function SubdomainRunner() {
  const router = useRouter();
  const [sub, setSub] = useState<string>("");
  const [qs, setQs] = useState<Q[]>([]);
  const [err, setErr] = useState<string>();
  const [loading, setLoading] = useState(true);

  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<"a" | "b" | "c" | "d" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    setSub(extractSub(String(router.query.id ?? "")));
  }, [router.isReady, router.query.id]);

  useEffect(() => {
    if (!sub) return;
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(undefined);
      try {
        const r = await fetch(`/api/quiz/questions?sub=${encodeURIComponent(sub)}&limit=10`);
        const j = await r.json();
        if (!r.ok || !j.ok) {
          const suggestions = j?.suggestions && Array.isArray(j.suggestions) ? `\nAvailable: ${j.suggestions.join(", ")}` : "";
          throw new Error(j?.error ? `${j.error}${suggestions}` : `HTTP ${r.status}`);
        }
        if (abort) return;
        setQs(j.data || []);
        setIdx(0);
        setChoice(null);
        setRevealed(false);
        setDone(false);
      } catch (e: any) {
        if (!abort) setErr(e.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [sub]);

  if (!router.isReady) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!sub) return <main style={{ padding: 24 }}>No subdomain provided.</main>;
  if (loading) return <main style={{ padding: 24 }}>Loading questions for <b>{sub}</b>…</main>;
  if (err) return <main style={{ padding: 24, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{err}</main>;
  if (!qs.length) return <main style={{ padding: 24 }}>No questions loaded for <b>{sub}</b>.</main>;

  if (done) {
    const correctCount = qs.filter((q: any) => q.__picked === q.correct).length;
    return (
      <main style={{ padding: 24, fontFamily: "system-ui,-apple-system,Segoe UI" }}>
        <h1 style={{ marginTop: 0 }}>{sub} — Completed</h1>
        <p>Score: <b>{correctCount}</b> / {qs.length}</p>
        <div style={{ marginTop: 12 }}>
          <a href="/quiz" style={{ display: "inline-block", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", textDecoration: "none" }}>
            ← Back to Domains
          </a>
        </div>
      </main>
    );
  }

  const q = qs[idx];

  const pick = async (opt: "a" | "b" | "c" | "d") => {
    if (revealed) return;
    setChoice(opt);
    setRevealed(true);
    (qs[idx] as any).__picked = opt;
    // fire-and-forget attempt
    fetch("/api/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain: sub, question_id: q.id, choice: opt }),
    }).catch(() => {});
  };

  const next = () => {
    if (idx + 1 >= qs.length) setDone(true);
    else { setIdx(idx + 1); setChoice(null); setRevealed(false); }
  };

  const Answer = ({ o }: { o: "a" | "b" | "c" | "d" }) => {
    const isCorrect = q.correct === o;
    const isPicked = choice === o;
    const bg = revealed ? (isCorrect ? "#dcfce7" : isPicked ? "#fee2e2" : "#fff") : isPicked ? "#e0f2fe" : "#fff";
    const border = revealed ? (isCorrect ? "#86efac" : isPicked ? "#fca5a5" : "#e5e7eb") : isPicked ? "#bae6fd" : "#e5e7eb";
    const label = o.toUpperCase();
    const text = (q as any)[o];
    return (
      <button
        onClick={() => pick(o)}
        disabled={revealed}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${border}`,
          background: bg,
          marginBottom: 8,
          cursor: revealed ? "default" : "pointer",
          whiteSpace: "pre-wrap", // preserve newlines in options
        }}
      >
        <b>{label}.</b> {text}
      </button>
    );
  };

  // Build "all rationales" list for wrong picks
  const wrongPick = revealed && choice !== null && choice !== q.correct;

  const rationaleFor = (o: "a" | "b" | "c" | "d") =>
    (o === "a" ? q.rationale_a
      : o === "b" ? q.rationale_b
      : o === "c" ? q.rationale_c
      : q.rationale_d) || q.rationale_correct || "";

  const RationaleRow = ({ o }: { o: "a" | "b" | "c" | "d" }) => {
    const isCorrect = q.correct === o;
    const isPicked = choice === o;
    const border = isCorrect ? "#86efac" : isPicked ? "#fca5a5" : "#e5e7eb";
    const bg = isCorrect ? "#dcfce7" : isPicked ? "#fee2e2" : "#f8fafc";
    return (
      <div
        style={{
          border: `1px solid ${border}`,
          background: bg,
          borderRadius: 8,
          padding: 8,
          marginTop: 8,
          whiteSpace: "pre-wrap", // preserve formatting in rationales
        }}
      >
        <b>{o.toUpperCase()}.</b>{" "}
        <span>{rationaleFor(o)}</span>
      </div>
    );
  };

  // Prefer specific rationale for correct choice if they answered correctly
  const singleRationale =
    (q.correct === "a" ? q.rationale_a :
     q.correct === "b" ? q.rationale_b :
     q.correct === "c" ? q.rationale_c :
     q.rationale_d) || q.rationale_correct || "";

  return (
    <main style={{ maxWidth: 820, margin: "24px auto", padding: "0 16px", fontFamily: "system-ui,-apple-system,Segoe UI" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{sub} — Question {idx + 1}/{qs.length}</h1>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Pick one answer</div>
      </header>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 16 }}>
        {/* Statement FIRST (preserve formatting) */}
        {q.statement ? (
          <p style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#64748b", whiteSpace: "pre-wrap" }}>
            {q.statement}
          </p>
        ) : null}

        {/* Question SECOND (preserve formatting) */}
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 18, whiteSpace: "pre-wrap" }}>
          {q.prompt}
        </p>

        <Answer o="a" />
        <Answer o="b" />
        <Answer o="c" />
        <Answer o="d" />

        {revealed && (
          wrongPick ? (
            // Wrong pick: show all rationales (A–D), color-coded
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Why (all options):</div>
              <RationaleRow o="a" />
              <RationaleRow o="b" />
              <RationaleRow o="c" />
              <RationaleRow o="d" />
            </div>
          ) : (
            // Correct pick: show the correct rationale only
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #86efac", borderRadius: 8, background: "#dcfce7", whiteSpace: "pre-wrap" }}>
              <b>Why:</b> <span>{singleRationale}</span>
            </div>
          )
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={next} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff" }}>
            {idx + 1 >= qs.length ? "Finish" : revealed ? "Next" : "Reveal & Next"}
          </button>
        </div>
      </section>
    </main>
  );
}
