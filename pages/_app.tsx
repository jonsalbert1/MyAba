// pages/_app.tsx
import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import type { Session } from "@supabase/supabase-js";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import "@/styles/globals.css";

const UserMenu = dynamic(() => import("@/components/UserMenu"), { ssr: false });
// Preview ribbon only renders in the browser (no SSR)
const EnvRibbon = dynamic(() => import("@/components/EnvRibbon"), { ssr: false });

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
  // Active if exact match, or subpath (except for "/")
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

  // After magic-link redirect, strip ?code & ?state to avoid PKCE/SSR noise
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("code") || url.searchParams.has("state")) {
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const links = [
    { href: "/", label: "Home" },
    { href: "/flashcards", label: "Flashcards" },
    { href: "/safmeds", label: "SAFMEDS" },
    { href: "/quiz", label: "Quiz" }, // was "/course"
    // add { href: "/admin", label: "Admin" } if/when needed
  ];

  return (
    <SessionContextProvider
      supabaseClient={supabase}
      // We’re not doing SSR auth right now; pass null to avoid PKCE helpers.
      initialSession={pageProps.initialSession ?? null}
    >
      {/* Shows 'Preview' on Vercel preview deployments */}
      <EnvRibbon />

      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          {/* Mobile menu button */}
          <button
            className="inline-flex items-center rounded-md p-2 md:hidden border"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          {/* Brand */}
          <Link href="/" className="text-lg font-semibold tracking-tight">
            myABA Study Suite
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
            {/* User menu (login/logout, shows email, etc.) */}
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
    </SessionContextProvider>
  );
}
