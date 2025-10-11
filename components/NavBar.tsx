// components/NavBar.tsx
import Link from "next/link";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href="/" className="text-xl font-bold tracking-tight text-blue-700">
          myABA Study Suite
        </Link>

        {/* Simple nav (optional, tweak as you like) */}
        <nav className="flex items-center gap-4 text-sm text-gray-700">
          <Link href="/flashcards" className="hover:text-blue-700">Flashcards</Link>
          <Link href="/safmeds" className="hover:text-blue-700">SAFMEDS</Link>
          <Link href="/quiz" className="hover:text-blue-700">Quiz</Link>
          <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
