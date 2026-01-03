// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!url || !anon) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

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
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }));

if (typeof window !== "undefined") {
  window.supabase = supabase;
}
