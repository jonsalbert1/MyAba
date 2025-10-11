import Link from "next/link";

export default function NavBar() {
  return (
    <header className="bg-blue-900 text-white">
      <nav className="max-w-6xl mx-auto flex items-center gap-6 px-4 py-3">
        <Link href="/" className="font-extrabold text-2xl tracking-wide">
          MyABA
        </Link>
        <div className="flex gap-4">
          <Link href="/flashcards" className="hover:text-gray-300">Flashcards</Link>
          <Link href="/quiz" className="hover:text-gray-300">Quiz</Link>
          <Link href="/safmeds" className="hover:text-gray-300">SAFMEDS</Link>
          <Link href="/admin" className="hover:text-gray-300">Admin</Link>
        </div>
      </nav>
    </header>
  );
}
