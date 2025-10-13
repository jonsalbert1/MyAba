// components/NavBar.tsx
import Link from "next/link";
import { useRouter } from "next/router";

function NavLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const active = router.pathname === href;
  const base =
    "px-3 py-2 rounded-lg text-sm transition-colors";
  const cls = active
    ? `${base} bg-sky-500 text-white`
    : `${base} text-slate-700 hover:bg-slate-100`;
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 border-b border-slate-200 p-[var(--container-px)]">
        <div className="flex items-center gap-2">
          <Link href="/" className="mr-2 text-base font-semibold text-slate-900">
            MyABA
          </Link>
          <span className="hidden text-slate-300 sm:inline">|</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink href="/" label="Home" />
          <NavLink href="/flashcards" label="Flashcards" />
          <NavLink href="/safmeds" label="SAFMEDS" />
          <NavLink href="/quiz" label="Quiz" />
        </div>

        <div className="ml-auto" />

        <div className="flex items-center gap-2">
          <NavLink href="/admin" label="Admin" />
        </div>
      </nav>
    </header>
  );
}
