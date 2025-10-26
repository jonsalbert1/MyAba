import { ReactNode } from "react";

export default function FlipCard({
  flipped,
  onToggle,
  front,
  back,
  heightClass = "min-h-[240px]",
}: {
  flipped: boolean;
  onToggle: () => void;
  front: ReactNode;
  back: ReactNode;
  heightClass?: string;
}) {
  return (
    <div
      className={`relative ${heightClass} card-surface border border-slate-200 bg-white rounded-xl p-4 cursor-pointer`}
    >
      <div className="perspective-1200">
        <div
          className={`relative preserve-3d transition-transform duration-500 gpu-hint ${
            flipped ? "rotate-y-180" : ""
          }`}
          onClick={onToggle}
          role="button"
          tabIndex={0}
        >
          {/* FRONT */}
          <div className="absolute inset-0 backface-hidden rounded-lg bg-white text-slate-900 p-4 flex items-center justify-center">
            {front}
          </div>

          {/* BACK */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg bg-white text-slate-900 p-4 flex items-center justify-center">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}
