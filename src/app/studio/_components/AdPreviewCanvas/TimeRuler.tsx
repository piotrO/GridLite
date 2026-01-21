"use client";

import { cn } from "@/lib/utils";

interface TimeRulerProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export const TimeRuler = ({ duration, onSeek }: TimeRulerProps) => {
  // Generate time ruler ticks (every 0.5s)
  const tickCount = Math.ceil(duration / 0.5) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => i * 0.5);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    onSeek(progress * duration);
  };

  return (
    <div
      className="relative h-6 bg-muted/50 border-b border-border flex items-end cursor-pointer"
      onClick={handleClick}
    >
      {ticks.map((tick) => {
        const left = (tick / (duration || 1)) * 100;
        const isMajor = tick % 1 === 0;
        return (
          <div
            key={tick}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${left}%`, transform: "translateX(-50%)" }}
          >
            <span
              className={cn(
                "text-[10px] text-muted-foreground mb-0.5",
                !isMajor && "opacity-50"
              )}
            >
              {isMajor ? `${tick}s` : ""}
            </span>
            <div
              className={cn("bg-border", isMajor ? "w-px h-3" : "w-px h-1.5")}
            />
          </div>
        );
      })}
    </div>
  );
};
