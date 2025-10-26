import React from "react";

/**
 * Shows a small "Preview" ribbon on Vercel preview deployments.
 * Logic:
 * - Prefer NEXT_PUBLIC_VERCEL_ENV if you map it in Vercel (Preview/Prod/Dev)
 * - Fallback: hostname ends with .vercel.app => treat as preview
 */
export default function EnvRibbon() {
  if (typeof window === "undefined") return null;

  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_NODE_ENV;
  const isPreviewEnv = env === "preview";
  const isVercelPreviewHost = window.location.hostname.endsWith(".vercel.app");
  const show = isPreviewEnv || isVercelPreviewHost;

  if (!show) return null;

  return (
    <div
      className="fixed right-2 top-2 z-[60] select-none rounded-full border bg-yellow-50/95 px-3 py-1 text-xs font-semibold text-yellow-800 shadow-sm backdrop-blur"
      title="Vercel Preview Deployment"
    >
      Preview
    </div>
  );
}
