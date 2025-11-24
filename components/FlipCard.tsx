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
    <div className="flex items-center justify-center w-full">
      <div
        className="
          relative
          aspect-square
          w-[90vw] max-w-[380px] sm:max-w-[420px] lg:max-w-[480px]
          card-surface border border-slate-200 bg-white
          rounded-2xl shadow-md
          cursor-pointer
          p-0
        "
      >
        <div className="perspective-1200 w-full h-full">
          <div
            className={`
              relative w-full h-full preserve-3d
              transition-transform duration-500 gpu-hint
              ${flipped ? "rotate-y-180" : ""}
            `}
            onClick={onToggle}
            role="button"
            tabIndex={0}
          >
            {/* FRONT */}
            <div
              className="
                absolute inset-0 backface-hidden
                rounded-2xl bg-white text-slate-900
                p-6 flex items-center justify-center
                text-center
              "
            >
              {front}
            </div>

            {/* BACK */}
            <div
              className="
                absolute inset-0 backface-hidden rotate-y-180
                rounded-2xl bg-white text-slate-900
                p-6 flex items-center justify-center
                text-center
              "
            >
              {back}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
