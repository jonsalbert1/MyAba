// pages/quiz/run.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RedirectQuizIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/quiz/runner");
  }, [router]);

  return null;
}

