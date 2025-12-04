// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// Public routes that should NOT require authentication
const PUBLIC_PATHS = [
  "/",                 // landing page
  "/login",            // magic link login
  "/signup",           // if you add a signup page later
  "/auth/callback",    // Supabase magic link callback
  "/api/health",       // example public endpoint
  "/api/signup-notify" // 🔔 allow signup notification API without auth
];

// Helper to check if route is public
function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Supabase auth helper
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Allow explicitly public paths
  if (isPublicPath(pathname)) {
    return res;
  }

  // Everything else requires authentication
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated → allow request through
  return res;
}

// Exclude Next.js internals, static assets, manifest, and brand images from middleware
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|brand/).*)",
  ],
};
