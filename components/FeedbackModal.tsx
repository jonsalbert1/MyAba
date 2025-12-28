import { FormEvent, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FeedbackModal({ open, onClose }: Props) {
  const user = useUser();
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Feedback message is required.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          userId: user?.id ?? null,
          email: user?.email ?? null,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to send feedback.");
      }

      setSuccess(true);
      setMessage("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error sending feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Send feedback</h2>
            <p className="mt-1 text-sm text-gray-600">
              This helps improve myABA.app for future BCBA cohorts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close feedback"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="fb-category">
              Category
            </label>
            <select
              id="fb-category"
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature request</option>
              <option value="question">Question</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="fb-message">
              Message <span className="text-red-600">*</span>
            </label>
            <textarea
              id="fb-message"
              className="w-full rounded-md border px-3 py-2 text-sm leading-snug"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Info about who it comes from */}
          <p className="text-[11px] text-gray-500">
            {user?.email
              ? `Submitted as ${user.email}.`
              : "You’re not signed in, so feedback will be anonymous."}
          </p>

          {error && (
            <p className="text-xs text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs text-emerald-700">
              Feedback sent — thank you!
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="rounded-md bg-black px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Submit feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
