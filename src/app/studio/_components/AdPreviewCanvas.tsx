import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  Download,
  RefreshCw,
  Check,
  ChevronDown,
  Move,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCredits } from "@/contexts/CreditContext";
import { UnlockModal } from "@/components/UnlockModal";
import { useAdPreviewBlob } from "@/hooks/useAdPreviewBlob";

interface AdSize {
  id: string;
  label: string;
  width: number;
  height: number;
}

const AD_SIZES: AdSize[] = [
  { id: "300x250", label: "Medium Rectangle", width: 300, height: 250 },
  { id: "728x90", label: "Leaderboard", width: 728, height: 90 },
  { id: "1080x1080", label: "Social Square", width: 1080, height: 1080 },
  { id: "160x600", label: "Wide Skyscraper", width: 160, height: 600 },
  { id: "320x50", label: "Mobile Banner", width: 320, height: 50 },
];

interface AdCanvasData {
  headline: string;
  bodyCopy: string;
  ctaText: string;
  imageUrl: string;
  colors: string[];
  logoUrl: string;
}

interface AdPreviewCanvasProps {
  selectedTemplate: string;
  adName?: string;
  data?: Partial<AdCanvasData>;
}

/**
 * Individual ad preview component that uses Blob URL
 */
interface AdPreviewItemProps {
  size: AdSize;
  templatePath: string;
  data: Partial<AdCanvasData>;
  reloadKey: number;
  onIframeRef: (sizeId: string, el: HTMLIFrameElement | null) => void;
}

const AdPreviewItem = ({
  size,
  templatePath,
  data,
  reloadKey,
  onIframeRef,
}: AdPreviewItemProps) => {
  // Memoize the data object to prevent unnecessary re-renders
  const previewData = useMemo(
    () => ({
      headline: data.headline,
      bodyCopy: data.bodyCopy,
      ctaText: data.ctaText,
      imageUrl: data.imageUrl,
      logoUrl: data.logoUrl,
      colors: data.colors,
    }),
    [
      data.headline,
      data.bodyCopy,
      data.ctaText,
      data.imageUrl,
      data.logoUrl,
      data.colors,
    ]
  );

  const { blobUrl, isLoading, error, refresh } = useAdPreviewBlob({
    templatePath,
    size: size.id,
    data: previewData,
    debounceMs: 300,
  });

  // Trigger refresh when reloadKey changes
  useEffect(() => {
    if (reloadKey > 0) {
      refresh();
    }
  }, [reloadKey, refresh]);

  const scale = Math.min(400 / size.width, 400 / size.height, 1);

  return (
    <motion.div
      key={size.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col gap-2"
    >
      <div className="text-xs text-muted-foreground text-center font-medium">
        {size.label} ({size.id})
      </div>
      <div
        className="rounded-xl overflow-hidden shadow-lg border-2 border-border bg-card relative"
        style={{
          width: Math.min(size.width, 400),
          height: Math.min(size.height, 400) * (Math.min(size.width, 400) / size.width),
        }}
      >
        {/* Loading state */}
        {isLoading && !blobUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
            <div className="text-xs text-destructive text-center p-2">
              Failed to load preview
              <br />
              <button
                onClick={refresh}
                className="underline mt-1 hover:text-destructive/80"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Actual template iframe with Blob URL */}
        {blobUrl && (
          <iframe
            ref={(el) => onIframeRef(size.id, el)}
            key={`${size.id}-${reloadKey}-blob`}
            src={blobUrl}
            className="border-0"
            width={size.width}
            height={size.height}
            title={`Ad Preview - ${size.label}`}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export const AdPreviewCanvas = ({
  selectedTemplate,
  adName = "Summer Sale Banner",
  data = {},
}: AdPreviewCanvasProps) => {
  const router = useRouter();
  const { credits, useCredit } = useCredits();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["300x250"]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const duration = 5;

  // Template path for the selected template
  // Note: Currently all templates use the same template000 folder
  // In the future, this can be extended to support multiple template folders
  const templatePath = `/templates/template000`;

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
          grid8player?: { timelineMaster?: { progress: (p: number) => void } };
        };
        if (iframeWindow?.grid8player?.timelineMaster) {
          iframeWindow.grid8player.timelineMaster.progress(progress);
        }
      } catch (e) {
        // Cross-origin or iframe not ready - ignore
      }
    });
  }, []);

  // Sync currentTime to iframes
  useEffect(() => {
    const progress = currentTime / duration;
    syncProgressToIframes(progress);
  }, [currentTime, duration, syncProgressToIframes]);

  const toggleSize = (sizeId: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId)
        ? prev.filter((id) => id !== sizeId)
        : [...prev, sizeId]
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
    []
  );

  const selectedAdSizes = AD_SIZES.filter((s) => selectedSizes.includes(s.id));

  const handleExport = () => {
    if (credits > 0) {
      useCredit();
      router.push("/export");
    } else {
      setShowUnlockModal(true);
    }
  };

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
          {/* Size Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Sizes
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-2 bg-card border-2 border-border"
              align="end"
            >
              <div className="space-y-1">
                {AD_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => toggleSize(size.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedSizes.includes(size.id)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          selectedSizes.includes(size.id)
                            ? "bg-primary border-primary"
                            : "border-border"
                        )}
                      >
                        {selectedSizes.includes(size.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <span>{size.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {size.id}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => {
              setReloadKey((prev) => prev + 1);
              setCurrentTime(0);
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Draggable Canvas Area */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
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
        {/* Timeline Scrubber with Playhead */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
          <div className="relative h-8 flex items-center">
            {/* Track Background */}
            <div className="absolute inset-x-0 h-2 bg-muted rounded-full">
              {/* Progress Fill */}
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
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
                left: `${(currentTime / duration) * 100}%`,
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
              onChange={(e) => {
                setCurrentTime(parseFloat(e.target.value));
                setIsPlaying(false);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(false);
            }}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={() => {
              if (currentTime >= duration) {
                setCurrentTime(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className={cn(isPlaying && "bg-accent hover:bg-accent/90")}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
          <Button
            variant="accent"
            size="sm"
            className="ml-4"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
};
