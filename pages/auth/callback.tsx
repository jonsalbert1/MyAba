import type { GetServerSideProps } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res, query } = ctx;
  const code = query.code;

  if (typeof code === "string") {
    const supabase = createPagesServerClient({ req, res });

    try {
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

  return {
    redirect: {
      destination: "/",
      permanent: false,
    },
  };
};

export default function AuthCallback() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-center">
      <p>Finishing sign-in...</p>
    </main>
  );
}
