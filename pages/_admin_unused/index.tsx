// pages/admin/index.tsx
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          This is a simplified admin home page. Older admin tools that
          referenced legacy <code>.js</code>/<code>.jsx</code> pages have
          been removed.
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-sm text-zinc-700">
          Core features of the app (quizzes, SAFMEDS, flashcards) now live in
          the main navigation. This admin area can be expanded in a future
          version if you want dedicated upload / maintenance tools.
        </p>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/quiz"
            className="rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Go to Quiz Suite
          </Link>

          <Link
            href="/safmeds"
            className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Go to SAFMEDS
          </Link>

          <Link
            href="/flashcards"
            className="rounded-md border border-purple-600 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50"
          >
            Go to Flashcards
          </Link>
        </div>
      </section>
    </main>
  );
}
