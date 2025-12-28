// pages/auth/signin.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LegacySignInAlias() {
  const router = useRouter();

  useEffect(() => {
    // Preserve ?next=... if present
    const { next } = router.query;
    const nextParam = typeof next === "string" ? next : undefined;

    const search = new URLSearchParams();
    if (nextParam) {
      search.set("next", nextParam);
    }

    const searchStr = search.toString();
    router.replace(`/login${searchStr ? `?${searchStr}` : ""}`);
  }, [router]);

  return (
    <main className="p-6 max-w-md mx-auto text-gray-600">
      <p>Redirecting to sign-in…</p>
    </main>
  );
}
