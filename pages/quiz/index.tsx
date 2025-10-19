import Head from "next/head";
import Link from "next/link";

export default function QuizIndex() {
  return (
    <>
      <Head>
        <title>myABA Study Suite | Quiz</title>
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-blue-900">
          Quiz
        </h1>
        <p className="mt-2 mb-8 text-gray-600">
          Select a subdomain to begin your scenario-based MCQ practice.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Replace with dynamic list later — for now, A1–A5 */}
          {["A1", "A2", "A3", "A4", "A5"].map((sub) => (
            <Link
              key={sub}
              href={`/quiz/sub/${sub}`}
              className="rounded-2xl border p-4 hover:shadow-sm bg-white transition"
            >
              <div className="text-lg font-medium">{sub}</div>
              <div className="text-sm text-gray-500">Domain A</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
