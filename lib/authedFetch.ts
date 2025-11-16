// lib/authedFetch.ts
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

const sb = createPagesBrowserClient();

export async function authedFetch(input: string, init: RequestInit = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated (no access token).");
  }
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
