// pages/api/subdomains.ts
import { createClient } from "@supabase/supabase-js";

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const table = process.env.QUIZ_TABLE_NAME || "quiz_questions"; // adjust if yours is different

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!url || !key) {
      return res
        .status(500)
        .json({ ok: false, error: "Supabase credentials missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // If your column names are 'subdomain' + 'subdomain_text'
    const { data, error } = await supabase
      .from(table)
      .select("subdomain, subdomain_text")
      .order("subdomain", { ascending: true });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Deduplicate in JS in case DB returns repeats
    const seen = new Set<string>();
    const items =
      (data || []).filter((row) => {
        const k = String(row.subdomain || "");
        if (seen.has(k)) return false;
        seen.add(k);
        return !!k;
      }) || [];

    return res.status(200).json({ ok: true, items });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

