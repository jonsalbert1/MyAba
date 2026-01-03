// pages/auth/callback.tsx
import type { GetServerSideProps } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createPagesServerClient(ctx);

  const code = ctx.query.code;
  if (typeof code === "string") {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (e) {
      return {
        redirect: { destination: "/login?error=auth_callback", permanent: false },
      };
    }
  }

  // session should exist now (cookie set)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const userId = session.user.id;
  const meta = (session.user.user_metadata ?? {}) as any;
  const metaFirst = String(meta.first_name ?? "").trim();
  const metaLast = String(meta.last_name ?? "").trim();

  // Read current profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    // Don't lock user out if profile read fails
    console.error("callback profile read error:", profileErr);
  }

  const dbFirst = String(profile?.first_name ?? "").trim();
  const dbLast = String(profile?.last_name ?? "").trim();

  // ✅ If DB is missing name but Auth metadata has it, write it to profiles now
  if ((!dbFirst || !dbLast) && metaFirst && metaLast) {
    const { error: upErr } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: metaFirst,
      last_name: metaLast,
    });

    if (upErr) {
      console.error("callback profile upsert error:", upErr);
      // If RLS blocks, you'll see it here
    }
  }

  // Re-check after upsert attempt
  const finalFirst = (dbFirst || metaFirst).trim();
  const finalLast = (dbLast || metaLast).trim();

  // Send them to profile only if we STILL don't have a name
  const redirectedFrom =
    typeof ctx.query.redirectedFrom === "string" ? ctx.query.redirectedFrom : "/";
  const safeNext = redirectedFrom.startsWith("/") ? redirectedFrom : "/";

  if (!finalFirst || !finalLast) {
    return {
      redirect: {
        destination: `/auth/profile?redirectedFrom=${encodeURIComponent(safeNext)}`,
        permanent: false,
      },
    };
  }

  return {
    redirect: { destination: safeNext, permanent: false },
  };
};

export default function AuthCallback() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-center">
      <p>Finishing sign-in...</p>
    </main>
  );
}
