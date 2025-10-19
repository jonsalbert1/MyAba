import { useRouter } from "next/router";
import { useEffect } from "react";

export default function TakeShim() {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const id = String(router.query.id || "").trim();
    if (id) router.replace(`/quiz/sub/${encodeURIComponent(id)}`);
  }, [router.isReady, router.query.id]);
  return null;
}
