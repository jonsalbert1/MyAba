// pages/admin/index.tsx
import type { GetServerSideProps } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function AdminHome() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-gray-600">Restricted area: uploads & management tools.</p>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // This helper reads/writes cookies correctly for Pages Router
  const supabase = createServerSupabaseClient(ctx);

  // Require a session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
    // Or: return { notFound: true } if you prefer a 404 for logged-out users
  }

  // Check admin flag from profiles
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { notFound: true };
  if (!profile?.is_admin) return { notFound: true };

  return { props: {} };
};
