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

  // allow public
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/auth/callback" ||
    pathname === "/auth/profile" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/icons")
  ) {
    return res;
  }

  // only protect these areas
  const protectedPrefixes = ["/quiz", "/safmeds", "/dashboard", "/admin"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!isProtected) return res;

  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", fullPath(req));
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/:path*"],
};
