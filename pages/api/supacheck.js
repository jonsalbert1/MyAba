export default async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || '').trim();
  let status = null, err = null;
  try {
    const r = await fetch(url + '/rest/v1/', { method: 'HEAD' });
    status = r.status;
  } catch (e) {
    err = String(e?.message || e);
  }
  res.status(200).json({ url, status, err });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req, res) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}
