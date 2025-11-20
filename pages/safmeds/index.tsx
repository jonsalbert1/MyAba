// pages/safmeds/index.tsx
import Link from "next/link";

export default function SafmedsIndexPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">SAFMEDS</h1>
      <p className="text-gray-600 text-sm">
        Choose what you’d like to do with your SAFMEDS data.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/safmeds/runner"
          className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="font-semibold mb-1">Run Trials</h2>
          <p className="text-sm text-gray-600">
            Go to the original SAFMEDS runner to time and record your trials.
          </p>
        </Link>

        <Link
          href="/safmeds/week"
          className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="font-semibold mb-1">Weekly Summary</h2>
          <p className="text-sm text-gray-600">
            View best-of-day performance and download weekly data.
          </p>
        </Link>
      </div>
    </div>
  );
}
