// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

function fullPath(req: NextRequest) {
  return req.nextUrl.pathname + (req.nextUrl.search || "");
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // ✅ IMPORTANT: only rescue auth codes on safe landing pages
  // Supabase OAuth/magic-link can land on /, /login, or /auth/* with ?code=...
  // BUT your app also uses "code" for quiz/subdomain stuff, so we must NOT hijack globally.
  const code = req.nextUrl.searchParams.get("code");
  const safeAuthLanding =
    pathname === "/" || pathname === "/login" || pathname.startsWith("/auth/");

  if (code && pathname !== "/auth/callback" && safeAuthLanding) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";

    // Replace the entire query so we don't accumulate junk params
    redirectUrl.search = "";
    redirectUrl.searchParams.set("code", code);

    // Preserve full original destination (path + query)
    redirectUrl.searchParams.set("redirectedFrom", fullPath(req));

    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Public routes (no redirects)
  const publicPaths = ["/", "/login", "/auth/callback", "/auth/profile", "/auth/finish"];
  const isPublic = publicPaths.includes(pathname);
  if (isPublic) return res;

  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 1) Not signed in → go to login
  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", fullPath(req));
    return NextResponse.redirect(redirectUrl);
  }

  // 2) Signed in → enforce profile completion (first + last name)
  const userId = session.user.id;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", userId)
    .maybeSingle();

  // If query fails, don't lock the user out—just allow.
  if (error) {
    console.error("middleware profile check error:", error);
    return res;
  }

  const first = (profile?.first_name ?? "").trim();
  const last = (profile?.last_name ?? "").trim();
  const incomplete = !first || !last;

  // If incomplete and not already on /auth/profile → send them there
  if (incomplete && pathname !== "/auth/profile") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/profile";
    redirectUrl.searchParams.set("redirectedFrom", fullPath(req));
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// ✅ IMPORTANT:
// Exclude Next.js internals and your static assets so middleware NEVER redirects image/font/icon requests.
// This prevents the login logo from being redirected to /login and breaking.
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|manifest.json|brand|icons).*)",
  ],
};
