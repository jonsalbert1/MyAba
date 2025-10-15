import Link from "next/link";

export default function NavBar() {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-black hover:text-blue-900 transition-colors"
          aria-label="myABA Study Suite"
        >
          <span className="text-xl md:text-2xl font-semibold tracking-tight">
            myABA Study Suite
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-4 text-sm md:text-base">
          <Link className="text-black hover:text-blue-900 transition-colors" href="/flashcards">
            Flashcards
          </Link>
          <Link className="text-black hover:text-blue-900 transition-colors" href="/safmeds">
            SAFMEDS
          </Link>
          <Link className="text-black hover:text-blue-900 transition-colors" href="/quiz">
            Quiz
          </Link>
          <Link className="text-black hover:text-blue-900 transition-colors" href="/admin">
            Admin
          </Link>
        </div>
      </nav>
    </header>
  );
}
