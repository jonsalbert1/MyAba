// pages/api/admin/do-something.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Verify a logged-in user via cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        get: (k) => req.cookies[k],
        set: (k, v) => res.setHeader('Set-Cookie', `${k}=${v}; Path=/; HttpOnly; SameSite=Lax`),
        remove: (k) => res.setHeader('Set-Cookie', `${k}=; Path=/; Max-Age=0`),
      } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  // 2) Check profile.is_admin with anon client (respects RLS)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!profile?.is_admin) return res.status(403).json({ ok: false, error: 'Forbidden' });

  // 3) Perform privileged work with service client
  // Example: bulk upsert to public tables
  // const { error: upsertErr } = await supabaseAdmin.from('quiz_questions').upsert(rows);
  // if (upsertErr) return res.status(500).json({ ok: false, error: upsertErr.message });

  return res.status(200).json({ ok: true });
}
