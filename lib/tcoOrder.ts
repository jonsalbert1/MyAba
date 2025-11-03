// lib/tcoOrder.ts
export const COUNTS: Record<string, number> = {
  A: 5, B: 24, C: 12, D: 9, E: 12, F: 8, G: 19, H: 8, I: 7,
};

export function listCodes(domain: string): string[] {
  const d = (domain ?? "").toUpperCase();
  const n = COUNTS[d] ?? 0;
  return Array.from({ length: n }, (_, i) => `${d}${i + 1}`);
}

export function firstCode(domain: string) {
  const arr = listCodes(domain);
  return arr[0] ?? "";
}

export function lastCode(domain: string) {
  const arr = listCodes(domain);
  return arr[arr.length - 1] ?? "";
}

export function nextCode(code: string): string | null {
  if (!code) return null;
  const d = code[0]?.toUpperCase();
  const i = parseInt(code.slice(1), 10);
  const max = COUNTS[d] ?? 0;
  if (!d || !i || !max) return null;
  if (i < max) return `${d}${i + 1}`;
  return null; // end of domain
}

export function prevCode(code: string): string | null {
  if (!code) return null;
  const d = code[0]?.toUpperCase();
  const i = parseInt(code.slice(1), 10);
  if (!d || !i) return null;
  if (i > 1) return `${d}${i - 1}`;
  return null; // start of domain
}
