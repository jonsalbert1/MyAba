// pages/auth/callback.tsx
import type { GetServerSideProps } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

function safeInternalPath(v: unknown) {
  if (typeof v !== "string") return null;
  if (!v.startsWith("/")) return null;
  return v;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createPagesServerClient(ctx);

  const code = ctx.query.code;
  if (typeof code === "string") {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (e) {
      console.error("[auth/callback] exchangeCodeForSession error:", e);
      return {
        redirect: {
          destination: "/login?error=auth_callback",
          permanent: false,
        },
      };
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const redirectedFrom = safeInternalPath(ctx.query.redirectedFrom) ?? "/";

  // ✅ pass through login/signup mode (default to login)
  const mode =
    typeof ctx.query.mode === "string" &&
    (ctx.query.mode === "signup" || ctx.query.mode === "login")
      ? ctx.query.mode
      : "login";

  return {
    redirect: {
      destination: `/auth/finish?redirectedFrom=${encodeURIComponent(
        redirectedFrom
      )}&mode=${encodeURIComponent(mode)}`,
      permanent: false,
    },
  };
};

export default function AuthCallback() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-center">
      <p>Finishing sign-in…</p>
    </main>
  );
}
