// pages/api/quiz-items.ts
const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const anon = process.env.SUPABASE_ANON_KEY || ""; // use anon for SELECT

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    if (!url || !anon) throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY missing");

    const { domain, subdomain, limit } = req.query as Record<string, string | undefined>;

    // Build PostgREST URL
    const params = new URLSearchParams();
    params.set("select", "id,prompt,choice_a,choice_b,choice_c,choice_d,correct_choice,rationale,domain,subdomain,created_at");
    params.set("order", "created_at.desc");
    if (limit) params.set("limit", String(Math.max(1, Math.min(1000, Number(limit)))));

    const filters: string[] = [];
    if (domain && domain.trim()) filters.push(`domain=eq.${encodeURIComponent(domain.trim())}`);
    if (subdomain && subdomain.trim()) filters.push(`subdomain=eq.${encodeURIComponent(subdomain.trim())}`);
    const filterQS = filters.length ? "&" + filters.join("&") : "";

    const resp = await fetch(`${url}/rest/v1/study_quiz_items?${params.toString()}${filterQS}`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return res.status(500).json({ ok: false, error: `Supabase REST ${resp.status}: ${t}` });
    }

    const data = await resp.json();
    return res.status(200).json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

