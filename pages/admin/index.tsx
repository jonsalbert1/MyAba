// pages/admin/index.tsx
import type { GetServerSideProps } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

// Reuse the same env-based admin list pattern
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export default function AdminHome() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-gray-600">
        Restricted area: uploads & management tools.
      </p>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);

  // ✅ Require a session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in – send to login (or "/" if you prefer)
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const email = user.email?.toLowerCase() ?? "";

  // ✅ Check if this email is in the admin list
  const isAdmin = ADMIN_EMAILS.includes(email);

  if (!isAdmin) {
    // Logged in but not an admin – hide the page
    return { notFound: true };
  }

  // ✅ Admin verified
  return { props: {} };
};
