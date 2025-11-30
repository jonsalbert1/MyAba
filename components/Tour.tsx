// components/Tour.tsx
import { useState, useEffect } from "react";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  attachTo?: string;   // CSS selector to highlight an element
};

export default function Tour({
  steps,
  onClose,
}: {
  steps: TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  const step = steps[index];

  useEffect(() => {
    if (!step?.attachTo) return;

    const el = document.querySelector(step.attachTo);
    if (!el) return;

    el.classList.add("ring-4", "ring-emerald-400", "rounded-md", "transition");

    return () => {
      el.classList.remove("ring-4", "ring-emerald-400", "rounded-md", "transition");
    };
  }, [step]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md shadow-xl space-y-4">
        <h2 className="text-xl font-semibold">{step.title}</h2>
        <p className="text-gray-700">{step.body}</p>

        <div className="flex justify-end gap-2">
          {index > 0 && (
            <button
              className="px-3 py-1.5 rounded-md border text-sm"
              onClick={() => setIndex((i) => i - 1)}
            >
              Back
            </button>
          )}

          {index < steps.length - 1 ? (
            <button
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm rounded"
              onClick={() => setIndex((i) => i + 1)}
            >
              Next
            </button>
          ) : (
            <button
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm rounded"
              onClick={onClose}
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
