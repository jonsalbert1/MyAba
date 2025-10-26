// pages/api/quiz/bulkUpsert.ts
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

type BulkUpsertBody = {
  items: Array<Record<string, any>>;
  onConflict?: string; // e.g., "id" or "code"
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body: BulkUpsertBody = req.body ?? {};
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "items[] required" });
  }

  const onConflict = body.onConflict ?? "id";
  try {
    const { error } = await supabase
      .from("quiz_items") // <-- change to your table name if different
      .upsert(body.items, { onConflict });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true, count: body.items.length });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

