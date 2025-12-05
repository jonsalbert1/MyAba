// pages/auth/callback.tsx
import type { GetServerSideProps } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { query } = ctx;
  const code = query.code;

  // Supabase sends ?code=... to this route after magic link / OAuth
  if (typeof code === "string") {
    // ✅ Pass the whole ctx so types line up with GetServerSidePropsContext
    const supabase = createPagesServerClient(ctx);

    try {
      // Exchange the code for a session and set auth cookies
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("🔴 Error exchanging code for session:", error);
      return {
        redirect: {
          destination: "/login?error=auth_callback",
          permanent: false,
        },
      };
    }
  }

  // After successful login, send the user to home (or another page)
  return {
    redirect: {
      destination: "/",
      permanent: false,
    },
  };
};

export default function AuthCallback() {
  // You should only see this briefly, if at all
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-center">
      <p>Finishing sign-in...</p>
    </main>
  );
}
