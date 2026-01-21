"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TimelineLayer } from "./types";
import { TIMELINE_COLORS } from "./constants";
import { TimeRuler } from "./TimeRuler";
import { TimelineTrack } from "./TimelineTrack";
import { TimelinePlayhead } from "./TimelinePlayhead";

interface DetailedTimelineProps {
  layers: TimelineLayer[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

/** Width of the layer label column */
const LABEL_WIDTH = 120;
/** Height of the time ruler */
const RULER_HEIGHT = 24;
/** Height of each layer track */
const TRACK_HEIGHT = 36;
/** Maximum visible tracks before scrolling */
const MAX_VISIBLE_TRACKS = 6;

export const DetailedTimeline = ({
  layers,
  currentTime,
  duration,
  onSeek,
}: DetailedTimelineProps) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [totalHeight, setTotalHeight] = useState(RULER_HEIGHT + TRACK_HEIGHT * 4);

  // Calculate total height for playhead
  useEffect(() => {
    const tracksHeight = Math.max(layers.length * TRACK_HEIGHT, TRACK_HEIGHT * 2);
    setTotalHeight(RULER_HEIGHT + Math.min(tracksHeight, TRACK_HEIGHT * MAX_VISIBLE_TRACKS));
  }, [layers.length]);

  return (
    <div className="space-y-2">
      {/* Time display */}
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>{Number(currentTime || 0).toFixed(2)}s</span>
        <span>{Number(duration || 0).toFixed(1)}s</span>
      </div>

      {/* Timeline container - relative for playhead positioning */}
      <div className="bg-muted/30 rounded-lg border border-border overflow-hidden relative">
        {/* Header row: Labels header + Time ruler */}
        <div className="flex">
          {/* Layers header */}
          <div
            className="shrink-0 bg-muted/80 border-r border-b border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ width: LABEL_WIDTH, height: RULER_HEIGHT }}
          >
            Layers
          </div>

          {/* Time ruler - this is the reference for playhead horizontal positioning */}
          <div className="flex-1 relative" ref={rulerRef}>
            <TimeRuler
              duration={duration}
              currentTime={currentTime}
              onSeek={onSeek}
            />
          </div>
        </div>

        {/* Scrollable tracks area - SINGLE scroll container for both labels and tracks */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: TRACK_HEIGHT * MAX_VISIBLE_TRACKS }}
        >
          {layers.length === 0 ? (
            <div
              className="flex items-center justify-center text-xs text-muted-foreground"
              style={{ height: TRACK_HEIGHT * 2 }}
            >
              No animated layers found
            </div>
          ) : (
            layers.map((layer, index) => {
              const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length];
              return (
                <div
                  key={layer.guid}
                  className={cn(
                    "flex border-b border-border/50 hover:bg-muted/20 transition-colors",
                    index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  )}
                  style={{ height: TRACK_HEIGHT }}
                >
                  {/* Layer label */}
                  <div
                    className="shrink-0 flex items-center gap-2 px-3 border-r border-border bg-muted/60"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-mono text-foreground truncate">
                      {layer.name}
                    </span>
                  </div>

                  {/* Track area */}
                  <div className="flex-1 relative">
                    <TimelineTrack
                      layer={layer}
                      index={index}
                      duration={duration}
                      onSeek={onSeek}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Single playhead spanning ruler + tracks - positioned absolutely within timeline container */}
        {layers.length > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: LABEL_WIDTH,
              right: 0,
              height: totalHeight,
            }}
          >
            <div className="relative h-full w-full pointer-events-none">
              <TimelinePlayhead
                currentTime={currentTime}
                duration={duration}
                height={totalHeight}
                onSeek={onSeek}
                containerRef={rulerRef}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
