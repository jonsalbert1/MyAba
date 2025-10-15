import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>myABA Study Suite | Home</title>
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-blue-900">
          Welcome to myABA Study Suite
        </h1>
        <p className="mt-2 mb-8 text-gray-600">
          Choose a section to get started.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/flashcards" className="rounded-2xl border p-4 hover:shadow">
            <div className="text-lg font-medium">Flashcards</div>
            <div className="text-sm text-gray-500">Study terms & definitions</div>
          </Link>

          <Link href="/safmeds" className="rounded-2xl border p-4 hover:shadow">
            <div className="text-lg font-medium">SAFMEDS</div>
            <div className="text-sm text-gray-500">Timed fluency practice</div>
          </Link>

          <Link href="/quiz" className="rounded-2xl border p-4 hover:shadow">
            <div className="text-lg font-medium">Quiz</div>
            <div className="text-sm text-gray-500">Scenario-based MCQs</div>
          </Link>

          <Link href="/admin" className="rounded-2xl border p-4 hover:shadow">
            <div className="text-lg font-medium">Admin</div>
            <div className="text-sm text-gray-500">Upload & manage decks</div>
          </Link>
        </div>
      </main>
    </>
  );
}
