import { Play, Pause, SkipBack, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onExport: () => void;
}

export const PlaybackControls = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSkipBack,
  onExport,
}: PlaybackControlsProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="iconSm" onClick={onSkipBack}>
        <SkipBack className="w-4 h-4" />
      </Button>
      <Button
        variant="default"
        size="icon"
        onClick={onPlayPause}
        className={cn(isPlaying && "bg-accent hover:bg-accent/90")}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </Button>
      <Button variant="accent" size="sm" className="ml-4" onClick={onExport}>
        <Download className="w-4 h-4 mr-2" />
        Publish
      </Button>
    </div>
  );
};
