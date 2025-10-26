import { createClient } from "@supabase/supabase-js";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const deckId = (process.env.GLOBAL_DECK_ID || "").trim();

  const diagnostics = {
    has_SUPABASE_URL: Boolean(url),
    has_SUPABASE_SERVICE_ROLE_KEY: Boolean(key),
    has_GLOBAL_DECK_ID: Boolean(deckId),
    supabase_hostname: url ? (() => { try { return new URL(url).hostname; } catch { return "INVALID_URL"; } })() : null,
    key_looks_like_jwt: key ? key.startsWith("eyJ") : false,
  };

  if (!url || !key) {
    return res.status(200).json({ ok: false, stage: "env_check", ...diagnostics });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("flashcards").select("id, term, def, deck_id").limit(1);

  if (error) {
    return res.status(200).json({ ok: false, stage: "select_test", error: error.message, ...diagnostics });
  }
  return res.status(200).json({ ok: true, stage: "select_test", sample: data, ...diagnostics });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}

