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

  // ✅ IMPORTANT: handle misplaced code redirects
  const code = req.nextUrl.searchParams.get("code");
  if (code && pathname !== "/auth/callback") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const publicPaths = ["/login", "/auth/callback", "/auth/profile", "/auth/finish"];
  const isPublic = publicPaths.some((p) => pathname === p);
  if (isPublic) return res;

  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", fullPath(req));
    return NextResponse.redirect(redirectUrl);
  }

  const userId = session.user.id;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("middleware profile check error:", error);
    return res;
  }

  const first = (profile?.first_name ?? "").trim();
  const last = (profile?.last_name ?? "").trim();
  const incomplete = !first || !last;

  if (incomplete && pathname !== "/auth/profile") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/profile";
    redirectUrl.searchParams.set("redirectedFrom", fullPath(req));
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
