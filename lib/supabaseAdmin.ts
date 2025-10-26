// lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 🛡️ Server-side Supabase client using the SERVICE ROLE key.
 * - Never import this file in client-side code.
 * - Ensure API routes using this run on the Node.js runtime (not Edge).
 */

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url) {
  throw new Error("Missing SUPABASE URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in env.");
}
if (!serviceKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in env.");
}

// HMR-safe singleton for API routes / dev
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
    // NOTE: removed `db: { schema: "public" }` to satisfy types when no Database generic is provided
    // If you have generated types, you can do:
    // import type { Database } from "@/types/supabase";
    // const client = createClient<Database>(url, serviceKey, { db: { schema: "public" } });
  }));
