// lib/quizProgress.ts
export const DOMAINS = ["A","B","C","D","E","F","G","H","I"] as const;
export type Domain = (typeof DOMAINS)[number];

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function makeCode(domain: Domain, n: number) {
  return `${domain}${n}`;
}

export function getLastCode(domain: Domain): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(`quiz:lastCode:${domain}`);
}

export function setLastCode(domain: Domain, code: string) {
  if (!isBrowser()) return;
  localStorage.setItem(`quiz:lastCode:${domain}`, code);
  // Dispatch a custom event for same-tab updates
  window.dispatchEvent(new Event("quiz-progress-updated"));
}

export function isSubdomainDone(domain: Domain, code: string): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(`quiz:done:${domain}:${code}`) === "1";
}

export function markSubdomainDone(domain: Domain, code: string) {
  if (!isBrowser()) return;
  localStorage.setItem(`quiz:done:${domain}:${code}`, "1");
  window.dispatchEvent(new Event("quiz-progress-updated"));
}

export function clearSubdomainDone(domain: Domain, code: string) {
  if (!isBrowser()) return;
  localStorage.removeItem(`quiz:done:${domain}:${code}`);
  window.dispatchEvent(new Event("quiz-progress-updated"));
}

export function getDomainAccuracy(domain: Domain): number {
  if (!isBrowser()) return 0;
  const raw = localStorage.getItem(`quiz:accuracy:${domain}`);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Save accuracy (0–100). Compute however you like in your runner. */
export function setDomainAccuracy(domain: Domain, accuracyPercent: number) {
  if (!isBrowser()) return;
  const clamped = Math.max(0, Math.min(100, Math.round(accuracyPercent)));
  localStorage.setItem(`quiz:accuracy:${domain}`, String(clamped));
  window.dispatchEvent(new Event("quiz-progress-updated"));
}
