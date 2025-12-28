// pages/_app.tsx
import Image from "next/image";
import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import type { Session } from "@supabase/supabase-js";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import "@/styles/globals.css";
import FeedbackModal from "@/components/FeedbackModal";

// Dynamic bits
const EnvRibbon = dynamic(() => import("@/components/EnvRibbon"), {
  ssr: false,
});
const UserMenu = dynamic(() => import("@/components/UserMenu"), {
  ssr: false,
});

/** Active link helper: uses .nav-link / .nav-link-active from globals.css */
function ActiveLink({
  href,
  label,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={isActive ? "nav-link-active" : "nav-link"}
    >
      {label}
    </Link>
  );
}

export default function App({
  Component,
  pageProps,
}: AppProps<{ initialSession?: Session | null }>) {
  const router = useRouter();
  const pathname = router.pathname;
  const [open, setOpen] = useState(false);

  // ✅ Single browser Supabase client (used by SessionContextProvider)
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  // Walkthrough modal state
  const [showTour, setShowTour] = useState(false);

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);

  const year = new Date().getFullYear();

  // Close mobile drawer on route change
  useEffect(() => {
    const handleRoute = () => setOpen(false);
    router.events.on("routeChangeComplete", handleRoute);
    router.events.on("hashChangeComplete", handleRoute);
    return () => {
      router.events.off("routeChangeComplete", handleRoute);
      router.events.off("hashChangeComplete", handleRoute);
    };
  }, [router.events]);

  // After magic-link / OAuth redirect, strip ?code & ?state
  // ⚠️ BUT NOT on /auth/callback — Supabase.exchangeCodeForSession needs them there
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip cleanup on auth callback so Supabase can read the params
    if (router.pathname.startsWith("/auth/callback")) return;

    const url = new URL(window.location.href);
    if (url.searchParams.has("code") || url.searchParams.has("state")) {
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.toString());
    }
  }, [router.pathname]);

  // 🔗 Main nav links — Quiz is the TOC; no separate Dashboard link anymore
  const links = [
    { href: "/", label: "Home" },
    { href: "/flashcards", label: "Flashcards" },
    { href: "/safmeds", label: "SAFMEDS" },
    { href: "/quiz", label: "Quiz" }, // TOC / main quiz hub
  ];

  // 🌟 Show guided tour once per browser (can be reopened from footer)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("myaba_tour_seen");
    if (!seen) {
      setShowTour(true);
    }
  }, []);

  const handleCloseTour = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("myaba_tour_seen", "1");
    }
    setShowTour(false);
  };

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession ?? null}
    >
      <EnvRibbon />

      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          {/* Mobile menu button */}
          <button
            className="inline-flex items-center rounded-md border p-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/myABA_logo_full.png"
              alt="myABA.app Study Suite"
              width={140}
              height={140}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="ml-auto hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <ActiveLink
                key={l.href}
                href={l.href}
                label={l.label}
                pathname={pathname}
              />
            ))}
            {/* Auth UI (Hi Jon / Sign in / Sign out + Admin) */}
            <UserMenu />
          </nav>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="border-t bg-white md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3">
              {links.map((l) => (
                <ActiveLink
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  pathname={pathname}
                  onClick={() => setOpen(false)}
                />
              ))}
              <div className="px-1 py-2">
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page content container */}
      <div className="mx-auto max-w-6xl px-4 py-4">
        <Component {...pageProps} />
      </div>

      {/* Global footer */}
      <footer className="mt-8">
        <hr className="border-t border-black" />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-4 text-center sm:flex-row sm:justify-between">
          <Link
            href="https://myaba.app"
            className="text-lg font-semibold text-black hover:underline"
          >
            © {year} myABA.app
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setShowTour(true)}
              className="underline-offset-2 hover:underline"
            >
              View walkthrough
            </button>
            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="underline-offset-2 hover:underline"
            >
              Send feedback
            </button>
          </div>
        </div>
      </footer>

      {/* Guided in-app walkthrough modal */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Welcome to myABA.app Study Suite
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Here&apos;s a quick walkthrough of how to use the app for
                  weekly study and reports.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseTour}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close walkthrough"
              >
                ✕
              </button>
            </div>

            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-800">
              <li>
                <span className="font-semibold">Sign up / Sign in:</span> Use
                your email to log in. You&apos;ll get a magic link to confirm
                your account.
              </li>
              <li>
                <span className="font-semibold">Flashcards:</span> Go to{" "}
                <span className="font-mono">Flashcards</span> to run quick
                term–definition practice from your current decks.
              </li>
              <li>
                <span className="font-semibold">SAFMEDS:</span> Use{" "}
                <span className="font-mono">SAFMEDS</span> for 1-minute fluency
                timings. Your best run per day is saved for weekly reports.
              </li>
              <li>
                <span className="font-semibold">Quiz:</span> Open{" "}
                <span className="font-mono">Quiz</span> to work through BCBA
                6th Task List domains and track your best accuracy by subdomain.
              </li>
              <li>
                <span className="font-semibold">Weekly reports:</span> The{" "}
                <span className="font-mono">SAFMEDS</span> week view and quiz
                dashboard summarize your progress for class assignments and
                self-management.
              </li>
              <li>
                <span className="font-semibold">Need help?</span> Use{" "}
                <span className="font-mono">Send feedback</span> in the footer
                to report issues or request features.
              </li>
            </ol>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseTour}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      <FeedbackModal
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </SessionContextProvider>
  );
}
