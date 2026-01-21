"use client";

import { useRef, useCallback } from "react";

interface TimelinePlayheadProps {
  currentTime: number;
  duration: number;
  height: number;
  onSeek: (time: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const TimelinePlayhead = ({
  currentTime,
  duration,
  height,
  onSeek,
  containerRef,
}: TimelinePlayheadProps) => {
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        onSeek(progress * duration);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [duration, onSeek, containerRef]
  );

  const left = (currentTime / (duration || 1)) * 100;

  return (
    <div
      className="absolute z-40 flex flex-col items-center cursor-ew-resize group pointer-events-auto"
      style={{
        left: `${left}%`,
        transform: "translateX(-50%)",
        top: 0,
        height: height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Large hit area for easier selection */}
      <div className="absolute inset-y-0 -left-3 -right-3" />
      
      {/* Playhead handle - bigger triangle */}
      <div 
        className="w-0 h-0 shrink-0 transition-transform group-hover:scale-110"
        style={{
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "14px solid hsl(var(--primary))",
        }}
      />
      
      {/* Playhead vertical line */}
      <div 
        className="w-0.5 bg-primary flex-1" 
        style={{ minHeight: height - 14 }}
      />
      
      {/* Bottom circle handle - bigger */}
      <div className="w-4 h-4 rounded-full bg-primary border-2 border-background shadow-lg shrink-0 transition-transform group-hover:scale-110" />
    </div>
  );
};
