// pages/quiz/continue.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Force SSR so Next.js doesn't try to prerender this page at build-time.
 * That avoids the "rendered a Promise" error during prerender.
 */
export function getServerSideProps() {
  return { props: {} };
}

export default function QuizContinue() {
  const router = useRouter();

  useEffect(() => {
    // All async/side effects happen on the client
    (async () => {
      try {
        // Prefer whatever you consider "last" (localStorage key written by runner)
        const domainLetters = "ABCDEFGHI";
        let target = "A1";

        for (const d of domainLetters) {
          const last = localStorage.getItem(`quiz:lastCode:${d}`);
          if (last) {
            target = last;
            break;
          }
        }

        // Fallback: look for "A1" if nothing found
        if (!target) target = "A1";

        // Redirect to the runner with that code
        router.replace({ pathname: "/quiz/runner", query: { code: target } });
      } catch {
        // If anything goes wrong, just go to TOC
        router.replace("/quiz");
      }
    })();
  }, [router]);

  // Lightweight shell while redirecting
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Continuing your quiz…</h1>
      <p className="text-gray-600">Finding your last subdomain and redirecting.</p>
    </main>
  );
}
