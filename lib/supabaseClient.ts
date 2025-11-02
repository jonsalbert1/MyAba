// ==============================
// File: lib/supabaseClient.ts
// Purpose: Single Supabase client for the browser (no PKCE)
// ==============================

import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Derive a unique storage key per project/env (optional)
const projectRef = (() => {
  try {
    const host = new URL(url).host; // e.g. abcd1234.supabase.co
    return host.split(".")[0] || "project";
  } catch {
    return "project";
  }
})();

// HMR-safe global reuse
declare global {
  // eslint-disable-next-line no-var
  var __supabase_client__: ReturnType<typeof createClient> | undefined;
  interface Window { supabase?: ReturnType<typeof createClient>; }
}

export const supabase =
  globalThis.__supabase_client__ ??
  (globalThis.__supabase_client__ = createClient(url, anon, {
    auth: {
      // ✅ Use implicit (magic link / OTP). Avoid PKCE to prevent /auth/v1/token?grant_type=pkce calls.
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: `myaba-auth-${projectRef}`,
    },
  }));

// Expose for console debugging
if (typeof window !== "undefined") {
  window.supabase = supabase;
}