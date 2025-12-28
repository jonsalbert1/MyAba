// pages/safmeds/downloads.tsx
import SafmedsWeek from "./week";

/**
 * SAFMEDS Weekly Report (Read-only)
 * This page simply mirrors the last 7 days view.
 * PDF exporting is done from the main SAFMEDS Week page.
 */
export default function SafmedsDownloadsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-4 space-y-1">
        <h1 className="text-3xl font-bold">SAFMEDS Weekly Report</h1>
        <p className="text-sm text-slate-600">
          This view mirrors your last 7 days of SAFMEDS activity.
          <br />
          To download a PDF, use the link on the main SAFMEDS Week page.
        </p>
      </header>

      {/* Simply render the weekly view */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SafmedsWeek />
      </section>
    </main>
  );
}
