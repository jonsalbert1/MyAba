import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    // For implicit magic links, the SDK already parsed the hash on landing pages.
    // For old PKCE links, this will just bounce home instead of 404.
    router.replace("/");
  }, [router]);
  return <p>Signing you in…</p>;
}

