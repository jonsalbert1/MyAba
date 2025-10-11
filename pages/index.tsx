// pages/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadFlashcards, loadQuiz } from "../lib/storage";

export default function Home() {
  const [fcCount, setFcCount] = useState<number>(0);
  const [qCount, setQCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      // Try DB first
      try {
        const [fcRes, qRes] = await Promise.allSettled([
          fetch("/api/flashcards/list?deckId=default").then((r) => r.json()),
          fetch("/api/quiz/list?deckId=default").then((r) => r.json()),
        ]);

        if (!cancelled) {
          if (fcRes.status === "fulfilled" && Array.isArray(fcRes.value.records)) {
            setFcCount(fcRes.value.records.length);
          } else {
            setFcCount(loadFlashcards().length);
          }

          if (qRes.status === "fulfilled" && Array.isArray(qRes.value.records)) {
            setQCount(qRes.value.records.length);
          } else {
            setQCount(loadQuiz().length);
          }
        }
      } catch {
        if (!cancelled) {
          setFcCount(loadFlashcards().length);
          setQCount(loadQuiz().length);
        }
      }
    }

    loadCounts();
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <section
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 10 }}>Welcome back, Jon</h1>
        <p style={{ color: "#444", marginBottom: 20 }}>
          Jump into a deck, run a quick quiz, or time a SAFMEDS trial.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
          }}
        >
          <Card title="Flashcards" meta={`${fcCount} terms`} href="/flashcards" />
          <Card title="Quiz" meta={`${qCount} items`} href="/quiz" />
          <Card title="SAFMEDS" meta="Timed trials & graph" href="/safmeds" />
        </div>
      </section>
    </main>
  );
}

function Card({ title, meta, href }: { title: string; meta: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid #e6e6e6",
        borderRadius: 12,
        padding: 18,
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ color: "#666", marginTop: 6 }}>{meta}</div>
    </Link>
  );
}
