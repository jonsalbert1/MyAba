// components/AppShell.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
  sidebar?: ReactNode; // optional custom sidebar per page
};

export default function AppShell({ title, children, sidebar }: Props) {
  const r = useRouter();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight text-slate-900">
            myABA
          </Link>

          {/* Simple top nav (desktop); adapt as needed */}
          <nav className="ml-4 hidden gap-3 md:flex text-sm">
            <Link href="/flashcards" className={linkClass(r.pathname.startsWith("/flashcards"))}>Flashcards</Link>
            <Link href="/safmeds" className={linkClass(r.pathname.startsWith("/safmeds"))}>SAFMEDS</Link>
            <Link href="/quiz" className={linkClass(r.pathname.startsWith("/quiz"))}>Quiz</Link>
            <Link href="/admin" className={linkClass(r.pathname.startsWith("/admin"))}>Admin</Link>
          </nav>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-3">
            {/* placeholder for future profile menu */}
            <div className="h-8 w-8 rounded-full bg-slate-200" aria-hidden />
          </div>
        </div>
      </header>

      {/* Content area: sidebar (desktop) + main */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-12">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:col-span-3 md:block">
          {sidebar ?? (
            <div className="sticky top-[68px] space-y-2">
              <Section title="Study">
                <NavItem href="/flashcards" active={r.pathname.startsWith("/flashcards")} label="Flashcards" />
                <NavItem href="/safmeds" active={r.pathname.startsWith("/safmeds")} label="SAFMEDS" />
                <NavItem href="/quiz" active={r.pathname.startsWith("/quiz")} label="Quiz" />
              </Section>
              <Section title="Manage">
                <NavItem href="/admin" active={r.pathname.startsWith("/admin")} label="Admin" />
              </Section>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="md:col-span-9">
          {title ? <h1 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h1> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function linkClass(active: boolean) {
  return [
    "rounded-md px-2 py-1",
    active ? "bg-slate-100 font-medium" : "text-slate-600 hover:text-slate-900"
  ].join(" ");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "rounded-md px-2 py-1 text-sm",
        active ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
