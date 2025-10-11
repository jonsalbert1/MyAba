// components/NavBar.tsx
import Link from "next/link";

export default function NavBar() {
  return (
    <header style={{ background: "#0f3d87", color: "#fff" }}>
      <nav
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 20px",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>MyABA</span>
        </Link>
        <div style={{ display: "flex", gap: 14, marginLeft: 12 }}>
          <Link href="/flashcards" style={{ color: "white" }}>Flashcards</Link>
          <Link href="/quiz" style={{ color: "white" }}>Quiz</Link>
          <Link href="/safmeds" style={{ color: "white" }}>SAFMEDS</Link>
          <Link href="/admin" style={{ color: "white" }}>Admin</Link>
        </div>
      </nav>
    </header>
  );
}
