import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: "A" | "B" | "C" | "D";
  rationale?: string | null;
  domain?: string | null;
  subdomain?: string | null;
};

export default function QuizPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showAns, setShowAns] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const domain = useMemo(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("domain") || ""), []);
  const subdomain = useMemo(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("subdomain") || ""), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams();
        if (domain) qs.set("domain", domain);
        if (subdomain) qs.set("subdomain", subdomain);
        const r = await fetch(`/api/quiz-items?${qs.toString()}`);
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "Failed to load quiz");
        const list: Item[] = j.data || [];
        setItems(list);
        setI(0); setPicked(null); setShowAns(false);
        setCorrectCount(0); setWrongCount(0);
        setErr(list.length ? null : "No quiz items found. Check CSV and filters.");
      } catch (e: any) { setErr(e.message || "Failed to load quiz"); }
      finally { setLoading(false); }
    })();
  }, [domain, subdomain]);

  const cur = items[i];

  async function logAnswer(pickedChoice: "A" | "B" | "C" | "D") {
    if (!cur) return;
    try {
      await fetch("/api/quiz-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: cur.id,
          picked_choice: pickedChoice,
          correct_choice: cur.correct_choice,
          domain: cur.domain ?? null,
          subdomain: cur.subdomain ?? null
        })
      });
    } catch {/* best-effort */}
  }

  async function onPick(ch: "A" | "B" | "C" | "D") {
    if (showAns || !cur) return;
    setPicked(ch); setShowAns(true);
    void logAnswer(ch);
    if (ch === cur.correct_choice) setCorrectCount(n => n + 1);
    else setWrongCount(n => n + 1);
  }

  function next() {
    if (!items.length) return;
    setI(n => (n + 1) % items.length);
    setPicked(null); setShowAns(false);
  }

  const choiceBtn = (label: "A" | "B" | "C" | "D", text: string) => {
    const isPicked = picked === label;
    const isCorrect = cur?.correct_choice === label;
    const base = "w-full text-left rounded-xl border px-3 py-2";
    let cls = `${base} border-slate-200 bg-white`;
    if (showAns) {
      if (isCorrect) cls = `${base} border-green-500 bg-green-50`;
      else if (isPicked) cls = `${base} border-red-500 bg-red-50`;
    } else if (isPicked) cls = `${base} border-sky-500 bg-sky-50`;
    return (
      <button key={label} onClick={() => onPick(label)} disabled={showAns} className={cls}>
        <b className="inline-block w-6">{label}.</b> {text}
      </button>
    );
  };

  return (
    <div className="page max-w-[820px]">
      <header className="mb-4 flex items-center gap-3">
        <h1 className="m-0 text-2xl font-semibold">Quiz</h1>
        <span className="text-xs opacity-70">
          {domain && <>Domain: <b>{domain}</b> · </>}
          {subdomain && <>Subdomain: <b>{subdomain}</b> · </>}
          {items.length > 0 && <>Item {i + 1} of {items.length}</>}
        </span>
        <div className="ml-auto" />
        <div className="rounded-full border border-slate-200 px-3 py-1 text-xs">
          ✅ {correctCount} &nbsp;•&nbsp; ❌ {wrongCount}
        </div>
        <a href="/admin" className="ml-2 text-sm underline">Admin →</a>
      </header>

      {loading && <p className="opacity-70">Loading…</p>}
      {err && <p className="text-red-700">{err}</p>}

      {!loading && !err && cur && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 whitespace-pre-wrap text-lg">{cur.prompt}</div>
          <div className="grid gap-2">
            {choiceBtn("A", cur.choice_a)}
            {choiceBtn("B", cur.choice_b)}
            {choiceBtn("C", cur.choice_c)}
            {choiceBtn("D", cur.choice_d)}
          </div>

          {showAns && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div><b>Correct:</b> {cur.correct_choice}</div>
              {!!cur.rationale && <div className="mt-1 whitespace-pre-wrap"><b>Rationale:</b> {cur.rationale}</div>}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button onClick={next} className="touch-target rounded-xl border border-slate-200 bg-white px-4 py-2">
              Next →
            </button>
          </div>
        </div>
      )}

      {!loading && !err && !cur && <p className="opacity-80">No items found. Try a different <code>?domain=</code> or upload more rows in Admin.</p>}
    </div>
  );
}
