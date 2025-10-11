// pages/index.tsx
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head><title>myABA Suite| Home</title></Head>
      <main className="min-h-screen px-6 py-8">
        <h1 className="text-3xl font-extrabold text-blue-900">Welcome to MyABA</h1>
        <p className="text-gray-600 mt-2 mb-6">Choose a section to get started:</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl">
          <Link href="/flashcards" className="block rounded-2xl bg-white shadow hover:shadow-md transition p-5">
            <h2 className="font-bold text-lg text-blue-900">Flashcards</h2>
            <p className="text-gray-600 text-sm mt-1">Flip terms & definitions</p>
          </Link>

          <Link href="/quiz" className="block rounded-2xl bg-white shadow hover:shadow-md transition p-5">
            <h2 className="font-bold text-lg text-blue-900">Quiz</h2>
            <p className="text-gray-600 text-sm mt-1">Multiple choice with rationale</p>
          </Link>

          <Link href="/safmeds" className="block rounded-2xl bg-white shadow hover:shadow-md transition p-5">
            <h2 className="font-bold text-lg text-blue-900">SAFMEDS</h2>
            <p className="text-gray-600 text-sm mt-1">1-min timings & graphs</p>
          </Link>

          <Link href="/admin" className="block rounded-2xl bg-white shadow hover:shadow-md transition p-5">
            <h2 className="font-bold text-lg text-blue-900">Admin</h2>
            <p className="text-gray-600 text-sm mt-1">Upload decks quickly</p>
          </Link>
        </div>
      </main>
    </>
  );
}
