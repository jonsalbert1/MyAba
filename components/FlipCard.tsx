import { ReactNode } from "react";

export default function FlipCard({
  flipped,
  onToggle,
  front,
  back,
}: {
  flipped: boolean;
  onToggle: () => void;
  front: ReactNode;
  back: ReactNode;
}) {
  return (
    <div
      // Outer wrapper: square card with perspective
      style={{
        aspectRatio: "1 / 1",
        perspective: "1200px",
      }}
      className="relative w-full max-w-sm mx-auto cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
    >
      <div
        // Flipping container
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.5s",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
          }}
          className="border border-slate-200 bg-white rounded-xl p-4 flex items-center justify-center text-center text-lg font-medium text-slate-900 shadow-sm"
        >
          {front}
        </div>

        {/* BACK */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="border border-slate-200 bg-white rounded-xl p-4 flex items-center justify-center text-center text-lg font-medium text-slate-900 shadow-sm"
        >
          {back}
        </div>
      </div>
    </div>
  );
}
