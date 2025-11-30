// pages/auth/callback.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const user = useUser();
  const supabase = useSupabaseClient();

  useEffect(() => {
    const run = async () => {
      if (!user) return; // wait for auth-helpers to hydrate

      // 1) Try to load existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("auth/callback profile load error", error);
      }

      let profile: Profile | null = (data as Profile) ?? null;

      // 2) If no profile row, ask API to upsert one with id + email
      if (!profile) {
        try {
          const res = await fetch("/api/profile/ensure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) {
            console.error("ensure-profile from callback failed", json.error);
          }
        } catch (e) {
          console.error("ensure-profile request error (callback)", e);
        }

        const { data: data2, error: error2 } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();

        if (error2) {
          console.error("auth/callback profile reload error", error2);
        }

        profile = (data2 as Profile) ?? null;
      }

      const noFirst = !profile?.first_name || profile.first_name.trim() === "";
      const noLast = !profile?.last_name || profile.last_name.trim() === "";

      // 3) Decide where to send them
      if (noFirst && noLast) {
        router.replace("/auth/profile"); // prompt for first/last name
      } else {
        router.replace("/"); // <<< UPDATED: go home instead of /quiz
      }
    };

    run();
  }, [user, supabase, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">Finishing sign-in…</p>
      </div>
    </main>
  );
}
