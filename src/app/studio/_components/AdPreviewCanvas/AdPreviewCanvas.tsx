"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCredits } from "@/contexts/CreditContext";
import { UnlockModal } from "@/components/UnlockModal";
import { parseManifestJs } from "@/lib/manifest-utils";

import type {
  AdPreviewCanvasProps,
  TimelineViewMode,
  TimelineLayer,
} from "./types";
import { AD_SIZES, DEFAULT_DURATION } from "./constants";
import { AdPreviewItem } from "./AdPreviewItem";
import { SizeSelector } from "./SizeSelector";
import { PlaybackControls } from "./PlaybackControls";
import { SimpleTimeline } from "./SimpleTimeline";
import { DetailedTimeline } from "./DetailedTimeline";
import { extractAnimatedLayers, getManifestDuration } from "./timeline-utils";

export const AdPreviewCanvas = ({
  selectedTemplate,
  adName = "Summer Sale Banner",
  isDPA = false,
  data = {},
}: AdPreviewCanvasProps) => {
  const router = useRouter();
  const { credits, useCredit } = useCredits();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);

  // UI state
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    isDPA ? ["1080x1080"] : ["300x600"],
  );
  const [timelineView, setTimelineView] = useState<TimelineViewMode>("simple");
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Canvas drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Iframe refs for playback sync
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  // Manifest and timeline data
  const [animatedLayers, setAnimatedLayers] = useState<TimelineLayer[]>([]);

  // Template path
  const templatePath = `/templates/${selectedTemplate}`;

  // Fetch manifest and extract animated layers
  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const basePath = `${templatePath}/${selectedSizes[0] || "300x600"}`;
        const res = await fetch(`${basePath}/manifest.js`);
        if (!res.ok) return;

        const manifestJs = await res.text();
        const manifest = parseManifestJs(manifestJs);

        const layers = extractAnimatedLayers(manifest);
        setAnimatedLayers(layers);

        const manifestDuration = getManifestDuration(manifest);
        if (manifestDuration > 0) {
          setDuration(manifestDuration);
        }
      } catch (error) {
        console.error("Failed to fetch manifest for timeline:", error);
      }
    };

    fetchManifest();
  }, [templatePath, selectedSizes]);

  // Effect to handle mode switching (dpa <-> standard)
  useEffect(() => {
    if (isDPA) {
      // For DPA, default to social square if not already selecting a social size
      const hasSocialSize = selectedSizes.some((s) =>
        ["1080x1080", "1080x1920"].includes(s),
      );
      if (!hasSocialSize) {
        setSelectedSizes(["1080x1080"]);
      }
    }
  }, [isDPA]); // eslint-disable-line react-hooks/exhaustive-deps

  // Playback sync effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.05;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Sync progress to all iframes
  const syncProgressToIframes = useCallback((progress: number) => {
    iframeRefs.current.forEach((iframe) => {
      try {
        const iframeWindow = iframe.contentWindow as Window & {
          grid8player?: {
            pause?: () => void;
            timelineMaster?: { progress: (p: number) => void };
          };
        };
        if (iframeWindow?.grid8player?.timelineMaster) {
          iframeWindow.grid8player.pause?.();
          iframeWindow.grid8player.timelineMaster.progress(progress);
        }
      } catch {
        // Cross-origin or iframe not ready - ignore
      }
    });
  }, []);

  // Sync currentTime to iframes
  useEffect(() => {
    const progress = currentTime / (duration || 1);
    syncProgressToIframes(progress);
  }, [currentTime, duration, syncProgressToIframes]);

  // Handlers
  const toggleSize = (sizeId: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId)
        ? prev.filter((id) => id !== sizeId)
        : [...prev, sizeId],
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, iframe")) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleIframeRef = useCallback(
    (sizeId: string, el: HTMLIFrameElement | null) => {
      if (el) {
        iframeRefs.current.set(sizeId, el);
      } else {
        iframeRefs.current.delete(sizeId);
      }
    },
    [],
  );

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (currentTime >= duration) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleExport = () => {
    if (credits > 0) {
      useCredit();
      router.push("/export");
    } else {
      setShowUnlockModal(true);
    }
  };

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
    setCurrentTime(0);
  };

  // Computed values
  const selectedAdSizes = useMemo(() => {
    let sizes = AD_SIZES;
    if (isDPA) {
      sizes = AD_SIZES.filter((s) => ["1080x1080", "1080x1920"].includes(s.id));
    }
    return sizes.filter((s) => selectedSizes.includes(s.id));
  }, [selectedSizes, isDPA]);

  return (
    <div className="flex flex-col h-full">
      <UnlockModal open={showUnlockModal} onOpenChange={setShowUnlockModal} />

      {/* Canvas Header */}
      <div className="flex items-center justify-between p-4 border-b border-border backdrop-blur-lg bg-background/80">
        <div>
          <h3 className="font-semibold text-foreground">{adName}</h3>
          <p className="text-xs text-muted-foreground">
            {selectedSizes.length} size{selectedSizes.length !== 1 ? "s" : ""}{" "}
            selected
          </p>
        </div>
        <div className="flex gap-2">
          <SizeSelector
            selectedSizes={selectedSizes}
            onToggleSize={toggleSize}
            availableSizes={
              isDPA
                ? AD_SIZES.filter((s) =>
                    ["1080x1080", "1080x1920"].includes(s.id),
                  )
                : undefined
            }
          />
          <Button variant="ghost" size="iconSm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Draggable Canvas Area */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <motion.div
          style={{ x: position.x, y: position.y }}
          className="p-8 flex flex-wrap gap-6 items-start justify-center min-w-max"
        >
          {selectedAdSizes.map((size) => (
            <AdPreviewItem
              key={size.id}
              size={size}
              templatePath={templatePath}
              data={data}
              reloadKey={reloadKey}
              onIframeRef={handleIframeRef}
            />
          ))}
        </motion.div>

        {/* Drag hint */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
          <Move className="w-3 h-3" />
          Click and drag to pan
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="p-4 border-t border-border backdrop-blur-lg bg-background/80 space-y-3">
        {/* Timeline View Toggle */}
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant={timelineView === "simple" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimelineView("simple")}
          >
            Simple
          </Button>
          <Button
            variant={timelineView === "detailed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimelineView("detailed")}
          >
            Detailed
          </Button>
        </div>

        {/* Timeline */}
        {timelineView === "simple" ? (
          <SimpleTimeline
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        ) : (
          <DetailedTimeline
            layers={animatedLayers}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        )}

        {/* Playback Controls */}
        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBack={handleSkipBack}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};
