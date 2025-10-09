import Link from "next/link";
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>myABA</h1>
      <ul>
        <li><Link href="/safmeds">SAFMEDS</Link></li>
        {/* add Quiz/Flashcards links here too */}
      </ul>
    </main>
  );
}
