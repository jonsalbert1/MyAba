// ==============================================
// lib/quizCatalog.ts — domain + subdomain catalog
// ==============================================
export type SubdomainId = `${"A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"I"}${number}`;

export type SubdomainInfo = {
  id: SubdomainId;
  title?: string;            // optional, can be filled later
  questionCountPlanned: number; // planned size of the bank (usually 10)
  questionCountLoaded: number;  // how many items currently in the DB/content
};

export type DomainInfo = {
  key: "A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"I";
  title: string;
  subdomains: SubdomainInfo[];
};

const makeRange = (key: DomainInfo["key"], from: number, to: number, loaded: number[] = []): SubdomainInfo[] => {
  const arr: SubdomainInfo[] = [];
  for (let n = from; n <= to; n++) {
    const id = `${key}${n}` as SubdomainId;
    arr.push({
      id,
      questionCountPlanned: 10,
      questionCountLoaded: loaded.includes(n) ? 10 : 0,
    });
  }
  return arr;
};

// ⚡ Prevent duplicate declaration by guarding with typeof check
// @ts-ignore
if (typeof globalThis.__QUIZ_CATALOG__ === "undefined") {
  // @ts-ignore
  globalThis.__QUIZ_CATALOG__ = [
    {
      key: "A",
      title: "Behaviorism & Philosophical Foundations",
      subdomains: makeRange("A", 1, 5, [1, 2, 3]),
    },
    {
      key: "B",
      title: "Concepts & Principles",
      subdomains: makeRange("B", 1, 24, []),
    },
    { key: "C", title: "Domain C", subdomains: makeRange("C", 1, 10) },
    { key: "D", title: "Domain D", subdomains: makeRange("D", 1, 10) },
    { key: "E", title: "Domain E", subdomains: makeRange("E", 1, 10) },
    { key: "F", title: "Domain F", subdomains: makeRange("F", 1, 10) },
    { key: "G", title: "Domain G", subdomains: makeRange("G", 1, 10) },
    { key: "H", title: "Domain H", subdomains: makeRange("H", 1, 10) },
    { key: "I", title: "Domain I", subdomains: makeRange("I", 1, 10) },
  ];
}

// @ts-ignore
export const QUIZ_CATALOG: DomainInfo[] = globalThis.__QUIZ_CATALOG__;

export type DomainSummary = {
  key: DomainInfo["key"];
  title: string;
  totalSubdomains: number;
  loadedSubdomains: number;
  remainingSubdomains: number;
};

export function summarizeDomain(d: DomainInfo): DomainSummary {
  const total = d.subdomains.length;
  const loaded = d.subdomains.filter(
    (s) => s.questionCountLoaded >= s.questionCountPlanned && s.questionCountPlanned > 0
  ).length;
  return {
    key: d.key,
    title: d.title,
    totalSubdomains: total,
    loadedSubdomains: loaded,
    remainingSubdomains: Math.max(0, total - loaded),
  };
}
