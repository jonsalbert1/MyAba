// pages/api/quiz-toc.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Shape returned by the endpoint
type TocResponse = {
  ok: true;
  domains: Array<{
    domain: string;
    subdomains: Array<{ subdomain: string; subdomain_text: string; item_count: number }>;
  }>;
} | {
  ok: false;
  error: string;
};

export default async function handler(req: any, res: any<TocResponse>) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    // Optional filters
    const onlyActive = (String(req.query.active ?? "1") === "1"); // default: only active
    const domainFilter = String(req.query.domain || "").trim();   // e.g., "A: Behaviorism and Philosophical Foundations"

    // Build base query
    let query = supabase
      .from("quiz_questions")
      .select("domain, subdomain, subdomain_text, is_active", { count: "exact" });

    if (onlyActive) {
      query = query.eq("is_active", true);
    }
    if (domainFilter) {
      query = query.eq("domain", domainFilter);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Group → { domain: { subdomain: { subdomain_text, count } } }
    const grouped: Record<string, Record<string, { subdomain_text: string; count: number }>> = {};

    for (const row of data || []) {
      const d = (row.domain || "").toString();
      const s = (row.subdomain || "").toString();
      const t = (row.subdomain_text || "").toString();

      if (!grouped[d]) grouped[d] = {};
      if (!grouped[d][s]) grouped[d][s] = { subdomain_text: t, count: 0 };
      grouped[d][s].count += 1;
      // keep first non-empty subdomain_text if multiple rows differ
      if (!grouped[d][s].subdomain_text && t) grouped[d][s].subdomain_text = t;
    }

    // Convert to sorted array
    const domains = Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((domain) => {
        const subs = Object.entries(grouped[domain])
          .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
          .map(([sub, info]) => ({
            subdomain: sub,
            subdomain_text: info.subdomain_text || "",
            item_count: info.count,
          }));
        return { domain, subdomains: subs };
      });

    return res.status(200).json({ ok: true, domains });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


