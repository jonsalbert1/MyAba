import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient, User } from "@supabase/supabase-js";

// If you already have getSupabaseBrowser(), use that instead
const supabase =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      )
    : (null as any);

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition
        ${active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}
      `}
    >
      {label}
    </Link>
  );
}

export default function NavBar() {
  const router = useRouter();
  const pathname = router.pathname;
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data.session?.user ?? null);
    })();

    const { data: sub } =
      supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
      });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center rounded-md p-2 md:hidden border"
            aria-label="Toggle menu"
            onClick={() => setOpen((s) => !s)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          <Link href="/" className="text-lg font-semibold tracking-tight">
            myABA Study Suite
          </Link>
        </div>

        {/* Center (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/" label="Home" pathname={pathname} />
          <NavLink href="/flashcards" label="Flashcards" pathname={pathname} />
          <NavLink href="/safmeds" label="SAFMEDS" pathname={pathname} />
          {/* ✅ Quiz now points to /course */}
          <Link
            href="/course"
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              pathname === "/course"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Quiz
          </Link>
        </div>

        {/* Right (auth) */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:inline text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t bg-white md:hidden">
          <Link
            href="/"
            className={`block px-4 py-2 text-sm ${
              pathname === "/" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => setOpen(false)}
          >
            Home
          </Link>

          <Link
            href="/flashcards"
            className={`block px-4 py-2 text-sm ${
              pathname === "/flashcards"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setOpen(false)}
          >
            Flashcards
          </Link>

          <Link
            href="/safmeds"
            className={`block px-4 py-2 text-sm ${
              pathname === "/safmeds"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setOpen(false)}
          >
            SAFMEDS
          </Link>

          {/* ✅ Quiz now points to /course on mobile too */}
          <Link
            href="/course"
            className={`block px-4 py-2 text-sm ${
              pathname === "/course"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setOpen(false)}
          >
            Quiz
          </Link>
        </div>
      )}
    </header>
  );
}
