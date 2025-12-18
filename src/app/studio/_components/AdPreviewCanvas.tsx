import { useState, useRef, useEffect } from "react";
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
  const duration = 5;

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

  const buildIframeSrc = (size: AdSize) => {
    const params = new URLSearchParams();
    if (data.headline) params.set("headline", data.headline);
    if (data.bodyCopy) params.set("body", data.bodyCopy);
    if (data.ctaText) params.set("cta", data.ctaText);
    if (data.imageUrl) params.set("image", data.imageUrl);
    if (data.colors?.[0]) params.set("color", data.colors[0]);
    if (data.logoUrl) params.set("logo", data.logoUrl);

    return `/templates/default/${size.width}x${
      size.height
    }/index.html?${params.toString()}`;
  };

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
          <Button variant="ghost" size="iconSm">
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
                  height:
                    Math.min(size.height, 400) *
                    (Math.min(size.width, 400) / size.width),
                }}
              >
                {/* Fallback preview when no template exists */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent via-gold to-accent flex flex-col items-center justify-center p-4 text-center">
                  <motion.div
                    animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-lg font-bold text-accent-foreground"
                  >
                    {data.headline || "SUMMER SALE"}
                  </motion.div>
                  <motion.div
                    animate={isPlaying ? { opacity: [1, 0.8, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-3xl font-extrabold text-accent-foreground"
                  >
                    50% OFF
                  </motion.div>
                  <motion.button
                    animate={isPlaying ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="mt-2 px-4 py-1.5 bg-foreground text-background rounded-full font-semibold text-xs"
                  >
                    {data.ctaText || "Shop Now"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
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
