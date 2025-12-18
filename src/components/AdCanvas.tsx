import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, Download, RefreshCw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdCanvasProps {
  adName?: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
}

export function AdCanvas({ 
  adName = "Summer Sale Banner", 
  isPlaying: initialPlaying = false,
  currentTime: initialTime = 0,
  duration = 5
}: AdCanvasProps) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const [currentTime, setCurrentTime] = useState(initialTime);

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">{adName}</h3>
          <p className="text-xs text-muted-foreground">300 × 250 • Medium Rectangle</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="iconSm">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="iconSm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-[300px] h-[250px] rounded-xl overflow-hidden shadow-lg border-2 border-border"
        >
          {/* Mock Ad Content */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-gold to-accent flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-3xl font-bold text-accent-foreground mb-2"
            >
              SUMMER SALE
            </motion.div>
            <motion.div
              animate={isPlaying ? { opacity: [1, 0.8, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-6xl font-extrabold text-accent-foreground"
            >
              50% OFF
            </motion.div>
            <motion.button
              animate={isPlaying ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="mt-4 px-6 py-2 bg-foreground text-background rounded-full font-semibold text-sm"
            >
              Shop Now
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Timeline Controls */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Timeline Scrubber */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{duration}s</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
              animate={isPlaying ? { width: "100%" } : {}}
              transition={isPlaying ? { duration: duration - currentTime, ease: "linear" } : {}}
              onUpdate={(latest) => {
                if (isPlaying && typeof latest.width === "string") {
                  const percent = parseFloat(latest.width) / 100;
                  setCurrentTime(percent * duration);
                }
              }}
            />
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
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
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(isPlaying && "bg-accent hover:bg-accent/90")}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
          <Button variant="accent" size="sm" className="ml-4" onClick={() => router.push("/export")}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
