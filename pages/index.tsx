// pages/index.tsx
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>myABA Suite | Home</title>
      </Head>

      <main className="page max-w-5xl">
        <h1 className="text-3xl font-extrabold text-blue-900">Welcome to MyABA</h1>
        <p className="mt-2 mb-6 text-gray-600">Choose a section to get started:</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/flashcards"
            className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <h2 className="text-lg font-bold text-blue-900">Flashcards</h2>
            <p className="mt-1 text-sm text-gray-600">Flip terms &amp; definitions</p>
          </Link>

          <Link
            href="/quiz"
            className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <h2 className="text-lg font-bold text-blue-900">Quiz</h2>
            <p className="mt-1 text-sm text-gray-600">Multiple choice with rationale</p>
          </Link>

          <Link
            href="/safmeds"
            className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <h2 className="text-lg font-bold text-blue-900">SAFMEDS</h2>
            <p className="mt-1 text-sm text-gray-600">1-min timings &amp; graphs</p>
          </Link>

          <Link
            href="/admin"
            className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <h2 className="text-lg font-bold text-blue-900">Admin</h2>
            <p className="mt-1 text-sm text-gray-600">Upload decks quickly</p>
          </Link>
        </div>
      </main>
    </>
  );
}
