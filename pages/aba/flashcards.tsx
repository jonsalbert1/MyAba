// Legacy route: redirect to the real Flashcards page.
import { useEffect } from "react";
import { useRouter } from "next/router";
export default function LegacyFlashcardsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/flashcards"); }, [router]);
  return null;
}
