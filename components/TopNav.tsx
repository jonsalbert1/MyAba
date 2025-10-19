// components/TopNav.tsx
import Link from "next/link";
import { useRouter } from "next/router";

export default function TopNav() {
  const r = useRouter();
  const is = (p: string) => r.pathname === p || r.pathname.startsWith(p + "/");

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-slate-900">
          myABA
        </Link>
        <nav className="ml-4 flex gap-3 text-sm">
          <Link className={linkClass(is("/flashcards"))} href="/flashcards">Flashcards</Link>
          <Link className={linkClass(is("/safmeds"))} href="/safmeds">SAFMEDS</Link>
          <Link className={linkClass(is("/quiz"))} href="/quiz">Quiz</Link>
          <Link className={linkClass(is("/admin"))} href="/admin">Admin</Link>
        </nav>
        <div className="ml-auto h-8 w-8 rounded-full bg-slate-200" aria-hidden />
      </div>
    </header>
  );
}

function linkClass(active: boolean) {
  return [
    "rounded-md px-2 py-1",
    active ? "bg-slate-100 font-medium" : "text-slate-600 hover:text-slate-900"
  ].join(" ");
}
