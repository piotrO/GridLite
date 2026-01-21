import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SimpleTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const SimpleTimeline = ({
  currentTime,
  duration,
  onSeek,
}: SimpleTimelineProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>{Number(currentTime || 0).toFixed(1)}s</span>
        <span>{Number(duration || 0).toFixed(1)}s</span>
      </div>
      <div className="relative h-8 flex items-center">
        {/* Track Background */}
        <div className="absolute inset-x-0 h-2 bg-muted rounded-full">
          {/* Progress Fill */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
          {/* Timeline Ticks */}
          <div className="absolute inset-0 flex justify-between px-1">
            {[...Array(11)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-px h-full",
                  i % 5 === 0 ? "bg-border" : "bg-transparent"
                )}
              />
            ))}
          </div>
        </div>

        {/* Playhead */}
        <motion.div
          className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
          style={{
            left: `${(currentTime / (duration || 1)) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
          <div className="w-0.5 flex-1 bg-primary" />
          <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md" />
        </motion.div>

        {/* Range Input for Scrubbing */}
        <input
          type="range"
          min="0"
          max={duration}
          step="0.01"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
