import { motion } from "framer-motion";
import { X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: { id: string; name: string; thumbnail: string; url?: string } | null;
}

export function VideoPlayerModal({
  open,
  onOpenChange,
  video,
}: VideoPlayerModalProps) {
  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-2 border-border">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {video.name}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-video bg-black">
          {/* Mock video player - in real implementation would use actual video */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={video.thumbnail}
              alt={video.name}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-primary transition-colors">
                  <svg
                    className="w-8 h-8 text-primary-foreground ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-white/90 text-sm">Click to play video</p>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
