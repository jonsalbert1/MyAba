// pages/index.tsx
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>myABA Study Suite | Home</title>
        <meta name="description" content="Choose a section to get started." />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-blue-900">
          Welcome to myABA Study Suite
        </h1>
        <p className="mt-2 mb-10 text-gray-600">
          Choose a section to get started.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/flashcards"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition"
          >
            <div className="text-xl font-semibold">Flashcards</div>
            <div className="mt-1 text-gray-500">Study terms &amp; definitions</div>
          </Link>

          <Link
            href="/safmeds"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition"
          >
            <div className="text-xl font-semibold">SAFMEDS</div>
            <div className="mt-1 text-gray-500">Timed fluency practice</div>
          </Link>

          <Link
            href="/quiz"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition"
          >
            <div className="text-xl font-semibold">Quiz</div>
            <div className="mt-1 text-gray-500">Scenario-based MCQs</div>
          </Link>

          <Link
            href="/admin"
            className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm hover:shadow transition md:col-span-3"
          >
            <div className="text-xl font-semibold">Admin</div>
            <div className="mt-1 text-gray-500">Upload &amp; manage decks</div>
          </Link>
        </div>
      </main>
    </>
  );
}
