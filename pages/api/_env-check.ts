import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

  res.status(200).json({
    ok: true,
    url_len: url.length,
    anon_len: anon.length,
    service_len: service.length,
    url_preview: url.slice(0, 40),
  });
}
