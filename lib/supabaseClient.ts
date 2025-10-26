// ==============================
// File: lib/supabaseClient.ts
// Purpose: Single Supabase client for the entire app
// ==============================

import { createClient } from "@supabase/supabase-js";

// --- Environment variables ---
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// --- Derive a unique storage key per project/env ---
const projectRef = (() => {
  try {
    const host = new URL(url).host; // e.g. abcd1234.supabase.co
    return host.split(".")[0] || "project";
  } catch {
    return "project";
  }
})();

// --- Global client reuse (HMR safe) ---
declare global {
  // eslint-disable-next-line no-var
  var __supabase_client__: ReturnType<typeof createClient> | undefined;
  interface Window {
    supabase?: ReturnType<typeof createClient>;
  }
}

export const supabase =
  globalThis.__supabase_client__ ??
  (globalThis.__supabase_client__ = createClient(url, anon, {
    auth: {
      flowType: "implicit",          // ✅ for magic link / OTP auth
      detectSessionInUrl: true,      // allow magic link redirects
      persistSession: true,
      autoRefreshToken: true,
      storageKey: `myaba-auth-${projectRef}`,
    },
  }));

// --- Optional: Expose to window for debugging ---
if (typeof window !== "undefined") {
  window.supabase = supabase;
  // console.log("[Supabase initialized]", url, `(storageKey: myaba-auth-${projectRef})`);
}
