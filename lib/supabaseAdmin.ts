// lib/supabaseAdmin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 🛡️ Server-side Supabase client using the SERVICE ROLE key.
 * - Never import this file in client-side code.
 * - Ensure your API routes run on the Node.js runtime (not Edge) when using the service role key.
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
  var __supabase_admin__: ReturnType<typeof createClient> | undefined;
}

export const supabaseAdmin =
  global.__supabase_admin__ ??
  (global.__supabase_admin__ = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: "public" },
    global: {
      // optional: set a custom fetch if you want timeouts/retries
      // fetch: (...args) => fetch(...args),
    },
  }));
