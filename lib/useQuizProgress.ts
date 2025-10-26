// lib/useQuizProgress.ts
import { useEffect, useState } from "react";
import {
  getLastCode,
  setLastCode,
  isSubdomainDone,
  markSubdomainDone,
  clearSubdomainDone,
  getDomainAccuracy,
  setDomainAccuracy,
  type Domain,
} from "@/lib/quizProgress";

/**
 * useQuizProgress
 * - Tracks last location, done-flag, and accuracy for a given domain/code
 * - Emits/handles events so Dashboard/TOC update immediately in the same tab
 */
export function useQuizProgress(domain: Domain, code: string) {
  const [currentLast, setCurrentLast] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    // Initialize from localStorage (client-only)
    setCurrentLast(getLastCode(domain));
    setDone(isSubdomainDone(domain, code));
    setAccuracy(getDomainAccuracy(domain));

    // Update when other tabs or this tab change progress
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key.startsWith("quiz:done:") ||
        e.key.startsWith("quiz:lastCode:") ||
        e.key.startsWith("quiz:accuracy:")
      ) {
        setCurrentLast(getLastCode(domain));
        setDone(isSubdomainDone(domain, code));
        setAccuracy(getDomainAccuracy(domain));
      }
    };

    const onLocal = () => {
      setCurrentLast(getLastCode(domain));
      setDone(isSubdomainDone(domain, code));
      setAccuracy(getDomainAccuracy(domain));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("quiz-progress-updated", onLocal as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("quiz-progress-updated", onLocal as EventListener);
    };
  }, [domain, code]);

  return {
    currentLast,
    done,
    accuracy,
    actions: {
      /** Set the last visited subdomain code for this domain */
      setLast: (c: string) => setLastCode(domain, c),
      /** Mark this subdomain complete (✅) */
      markDone: () => markSubdomainDone(domain, code),
      /** Clear completion flag for this subdomain */
      clearDone: () => clearSubdomainDone(domain, code),
      /** Save a 0–100 accuracy value for this domain */
      setAccuracy: (pct: number) => setDomainAccuracy(domain, pct),
    },
  };
}
