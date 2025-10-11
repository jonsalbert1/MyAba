// pages/index.tsx
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head><title>myABA | Home</title></Head>
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f3d87" }}>Welcome to MyABA</h1>
        <p style={{ color: "#6b7280", margin: "6px 0 16px" }}>
          Choose a section to get started:
        </p>
        <ul style={{ lineHeight: "1.9" }}>
          <li><Link href="/flashcards">Flashcards</Link></li>
          <li><Link href="/quiz">Quiz</Link></li>
          <li><Link href="/safmeds">SAFMEDS</Link></li>
          <li><Link href="/admin">Admin</Link></li>
        </ul>
      </main>
    </>
  );
}
