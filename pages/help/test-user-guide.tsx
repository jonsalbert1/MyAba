// pages/help/test-user-guide.tsx
import Head from "next/head";
import Image from "next/image";

export default function TestUserGuidePage() {
  return (
    <>
      <Head>
        <title>myABA Test User Guide (Beta)</title>
      </Head>
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <header className="mb-10 border-b pb-4">
            <h1 className="text-3xl font-bold text-slate-900">
              myABA Study Suite – Test User Guide (Beta)
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This page is for test users helping to evaluate the myABA Study Suite.
              It explains how to log in, navigate key features, and what to look for
              while testing. For a printable version, use the PDF guide.
            </p>
          </header>

          {/* Section 1: Purpose */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Purpose</h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              This guide is intended for QA testers, peers, supervisors, and professors
              who are using myABA Study Suite in a test or beta environment. The goal is
              to verify that navigation, data saving, and visuals are working as expected
              before wider rollout.
            </p>
          </section>

          {/* Section 2: Environments */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              2. Test Environments
            </h2>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>
                <strong>Localhost:</strong> <code>http://localhost:3000</code> – developer only.
              </li>
              <li>
                <strong>Staging:</strong> <code>https://staging.myaba.app</code> – pre-production.
              </li>
              <li>
                <strong>Production:</strong> <code>https://myaba.app</code> – live & stable.
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Unless otherwise noted, testers should use the staging environment.
            </p>
          </section>

          {/* Section 3: Logging In */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              3. Logging In with Magic Link
            </h2>
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
              <li>Navigate to the provided myABA URL (typically staging).</li>
              <li>Click <strong>Log In</strong> or <strong>Get Started</strong>.</li>
              <li>Enter your email address and submit.</li>
              <li>
                Check your inbox for an email from myABA / Supabase and click the magic
                link.
              </li>
              <li>
                You should be redirected back to myABA and see your dashboard or home
                screen.
              </li>
            </ol>

            {/* Screenshot row */}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <ScreenshotCard
                label="Screenshot 1"
                caption="Login screen"
                src="/screenshots/login.png"
              />
              <ScreenshotCard
                label="Screenshot 2"
                caption="Magic link email"
                src="/screenshots/magic-link-email.png"
              />
              <ScreenshotCard
                label="Screenshot 3"
                caption="Dashboard after login"
                src="/screenshots/dashboard.png"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Replace the <code>src</code> paths with your actual screenshot files
              (e.g., add them in <code>/public/screenshots</code>).
            </p>
          </section>

          {/* Section 4: Navigation Overview */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              4. Global Navigation Overview
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              Once logged in, you should see a navigation bar with links similar to:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Dashboard / Home</li>
              <li>Quizzes</li>
              <li>Flashcards</li>
              <li>SAFMEDS</li>
              <li>Reports / Week View</li>
              <li>Feedback</li>
              <li>User menu (profile & sign-out)</li>
            </ul>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ScreenshotCard
                label="Screenshot 4"
                caption="Global navigation bar with environment ribbon"
                src="/screenshots/nav.png"
              />
              <ScreenshotCard
                label="Screenshot 5"
                caption="User menu (open state)"
                src="/screenshots/user-menu.png"
              />
            </div>
          </section>

          {/* Section 5: Quizzes */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              5. Quizzes (Task List Practice)
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              Use <strong>Quizzes</strong> to practice BCBA 6th Edition Task List items
              by domain and subdomain.
            </p>

            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              5.1 Table of Contents (TOC)
            </h3>
            <p className="text-sm text-slate-700">
              The TOC lists domains A–I and their subdomains (e.g., B-01, B-02). For each
              subdomain you may see best accuracy %, completion status, and actions like
              <strong> Start</strong>, <strong>Resume</strong>, or <strong>Retake</strong>.
            </p>
            <div className="mt-3">
              <ScreenshotCard
                label="Screenshot 6"
                caption="Quiz TOC (domains A–I)"
                src="/screenshots/quiz-toc.png"
              />
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-900 mb-1">
              5.2 Quiz Runner
            </h3>
            <p className="text-sm text-slate-700 mb-2">
              The quiz runner presents one multiple-choice question at a time with
              options A–D, subdomain info, and progress (e.g., 3/10). After selecting an
              answer, you should see immediate feedback and, if enabled, a rationale.
              At the end you should get a summary and a way to retry or move on.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <ScreenshotCard
                label="Screenshot 7"
                caption="Quiz question view"
                src="/screenshots/quiz-question.png"
              />
              <ScreenshotCard
                label="Screenshot 8"
                caption="Quiz completion summary"
                src="/screenshots/quiz-summary.png"
              />
            </div>
          </section>

          {/* Section 6: Flashcards */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              6. Flashcards
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              The Flashcards section shows term/definition pairs. Click or tap the card
              to flip it. Use controls to move forward/backward and optionally shuffle
              or filter by domain/class.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <ScreenshotCard
                label="Screenshot 9"
                caption="Flashcard front (term)"
                src="/screenshots/flashcard-front.png"
              />
              <ScreenshotCard
                label="Screenshot 10"
                caption="Flashcard back (definition)"
                src="/screenshots/flashcard-back.png"
              />
              <ScreenshotCard
                label="Screenshot 11"
                caption="Deck/filter controls"
                src="/screenshots/flashcard-filters.png"
              />
            </div>
          </section>

          {/* Section 7: SAFMEDS */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              7. SAFMEDS (Timed Fluency Practice)
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              SAFMEDS lets you run timed fluency trials with selected decks. You should
              see a timer, controls to start/end the timing, and a summary of correct
              and incorrect responses at the end of each run.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <ScreenshotCard
                label="Screenshot 12"
                caption="SAFMEDS home (today/week summary)"
                src="/screenshots/safmeds-home.png"
              />
              <ScreenshotCard
                label="Screenshot 13"
                caption="SAFMEDS run in progress"
                src="/screenshots/safmeds-run.png"
              />
              <ScreenshotCard
                label="Screenshot 14"
                caption="SAFMEDS run summary"
                src="/screenshots/safmeds-summary.png"
              />
            </div>
          </section>

          {/* Section 8: Weekly Reports */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              8. Weekly Reports & Graphs
            </h2>
            <p className="text-sm text-slate-700 mb-3">
              The Reports or Week View page shows graphs of your performance (e.g.,
              daily totals, best-of-day, or quiz accuracy). Some builds may also offer a
              PDF export.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <ScreenshotCard
                label="Screenshot 15"
                caption="Weekly report charts"
                src="/screenshots/report-week.png"
              />
              <ScreenshotCard
                label="Screenshot 16"
                caption="Example downloaded PDF report"
                src="/screenshots/report-pdf.png"
              />
            </div>
          </section>

          {/* Section 9: What to Look For */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              9. What Testers Should Watch For
            </h2>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Navigation bugs (buttons/links not working, wrong destinations).</li>
              <li>Data issues (scores not saving, summaries incorrect).</li>
              <li>Layout glitches (cut-off text, overlapping elements).</li>
              <li>Performance problems (very slow loads, freezing timers).</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              When you find an issue, capture a short description, steps to reproduce,
              browser/device, and a screenshot if possible.
            </p>
          </section>

          {/* Section 10: Sign Out */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              10. Signing Out
            </h2>
            <p className="text-sm text-slate-700">
              Use the user menu (top-right) and select <strong>Sign Out</strong>. You
              should be redirected to the public landing or login page. Refreshing the
              app after sign-out should keep you logged out until you use a magic link
              again.
            </p>
          </section>

          {/* Footer */}
          <footer className="mt-10 border-t pt-4 text-xs text-slate-500">
            For questions or to report issues, contact Jon with a brief description,
            environment (local/staging/production), and screenshots where possible.
          </footer>
        </div>
      </main>
    </>
  );
}

type ScreenshotCardProps = {
  label: string;
  caption: string;
  src: string;
};

function ScreenshotCard({ label, caption, src }: ScreenshotCardProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative h-32 w-full bg-slate-100">
        {/* Replace src with real screenshots in /public/screenshots */}
        <Image
          src={src}
          alt={caption}
          fill
          className="object-cover"
        />
      </div>
      <figcaption className="px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-xs text-slate-800">{caption}</div>
      </figcaption>
    </figure>
  );
}
