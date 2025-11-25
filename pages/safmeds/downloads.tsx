// pages/safmeds/downloads.tsx
import Link from "next/link";

export default function SafmedsDownloads() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">SAFMEDS Downloads & Reports</h1>
        <p className="text-sm text-slate-600">
          Access weekly graphs and data exports.
        </p>
      </header>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/safmeds" className="underline text-slate-600">
          ← Back to SAFMEDS Home
        </Link>
        <Link href="/safmeds/trials" className="underline text-slate-600">
          Go to Timings
        </Link>
      </nav>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          Available reports
        </h2>
        <ul className="list-disc pl-5 text-sm space-y-2">
          <li>
            <Link href="/safmeds/week" className="text-blue-600 underline">
              Weekly SAFMEDS graphs & PDF export
            </Link>
          </li>
          {/* Add future CSV/PDF API links here */}
        </ul>
      </div>
    </div>
  );
}
