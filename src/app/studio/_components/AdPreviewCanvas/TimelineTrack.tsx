"use client";

import { motion } from "framer-motion";
import type { TimelineLayer } from "./types";
import { TIMELINE_COLORS } from "./constants";

interface TimelineTrackProps {
  layer: TimelineLayer;
  index: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const TimelineTrack = ({
  layer,
  index,
  duration,
  onSeek,
}: TimelineTrackProps) => {
  const safeDuration = duration || 1;
  const left = (layer.delay / safeDuration) * 100;
  const width = (layer.duration / safeDuration) * 100;
  const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length];

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    onSeek(progress * duration);
  };

  return (
    <div
      className="flex-1 relative h-full cursor-pointer"
      onClick={handleClick}
    >
      {/* Animation bar */}
      <motion.div
        className="absolute top-1 bottom-1 rounded"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 1)}%`,
          background: `linear-gradient(90deg, ${color}dd, ${color}99)`,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        title={`${layer.name}: ${layer.delay.toFixed(2)}s → ${layer.endTime.toFixed(2)}s`}
      >
        {/* Duration label inside bar */}
        {width > 8 && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-medium">
            {layer.duration.toFixed(1)}s
          </span>
        )}
      </motion.div>

      {/* Keyframe markers */}
      <div
        className="absolute top-1/2 w-2 h-2 bg-white border-2 rounded-sm shadow-sm transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{
          left: `${left}%`,
          borderColor: color,
        }}
      />
      <div
        className="absolute top-1/2 w-2 h-2 bg-white border-2 rounded-sm shadow-sm transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{
          left: `${left + width}%`,
          borderColor: color,
        }}
      />
    </div>
  );
};
