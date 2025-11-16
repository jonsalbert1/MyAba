// lib/auth.ts
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
