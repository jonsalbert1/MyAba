// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl;

  // Routes that middleware should IGNORE / always allow
  const publicPaths = ["/", "/login", "/auth/callback"];
  const isPublic = publicPaths.some((path) => url.pathname === path);

  if (isPublic) {
    return res;
  }

  // Create Supabase client bound to this request/response
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session and trying to access a protected route, go to /login
  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If already logged in and hitting /login, bounce home (optional)
  if (session && url.pathname === "/login") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return res;
}

// Only protect specific paths – NOT /auth/*
export const config = {
  matcher: [
    "/quiz/:path*",   // all quiz pages
    "/safmeds/:path*", // all safmeds pages
    // add more here if you want, e.g. "/admin/:path*"
  ],
};
