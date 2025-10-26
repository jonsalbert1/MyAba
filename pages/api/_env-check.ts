// pages/api/_env-check.ts
export default function handler(_req: any, res: any) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 6);
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  res.status(200).json({
    ok: true,
    supabaseUrlPresent: Boolean(url),
    anonKeyPrefix: anon || null,
    hasServiceRole: hasService,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV || null,
  });
}
