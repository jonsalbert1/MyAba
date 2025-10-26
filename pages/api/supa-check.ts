export default async function handler(_req: any, res: any) {
  try {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return res.status(200).json({
        ok: false,
        reason: 'Missing env(s)',
        SUPABASE_URL_present: !!url,
        SERVICE_ROLE_present: !!key,
      });
    }

    // HEAD is enough; fall back to GET if host blocks HEAD
    const target = `${url.replace(/\/+$/,'')}/rest/v1/`;
    const r = await fetch(target, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    return res.status(200).json({
      ok: r.ok,
      status: r.status,
      statusText: r.statusText,
      tested: target,
    });
  } catch (e: any) {
    return res.status(200).json({
      ok: false,
      errorName: e?.name,
      errorMessage: e?.message,
      hint: "If this says 'fetch failed', SUPABASE_URL is wrong or unreachable (missing https://, trailing space, or network/DNS issue).",
    });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


