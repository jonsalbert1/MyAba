// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Touch the session so the helper can set/refresh cookies
  await supabase.auth.getSession();

  return res;
}

// Include API routes so the cookie is available to your API handlers
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
