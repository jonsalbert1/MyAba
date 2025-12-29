// lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 🛡️ Server-side Supabase client using the SERVICE ROLE key.
 * - Use only in API routes or server components.
 * - Never import this file in client-side code.
 * - Ensure those routes use the Node.js runtime (not Edge).
 */

const url =
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url) {
  console.error("[supabaseAdmin] ❌ Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  throw new Error("Missing SUPABASE URL in environment variables.");
}

if (!serviceKey) {
  console.error("[supabaseAdmin] ❌ Missing SUPABASE_SERVICE_ROLE_KEY.");
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
}

// ✅ Use HMR-safe singleton pattern (avoids recreating during dev hot reloads)
declare global {
  // eslint-disable-next-line no-var
  var __supabase_admin__: SupabaseClient | undefined;
}

export const supabaseAdmin: SupabaseClient =
  global.__supabase_admin__ ??
  (global.__supabase_admin__ = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "myaba-admin" },
    },
  }));

// 🧩 Optional: Debug log in dev
if (process.env.NODE_ENV === "development") {
  console.log("[supabaseAdmin] ✅ Initialized with SERVICE ROLE key and URL:", url);
}
