import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  CreditCard,
  Check,
  Video,
  Music,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCredits } from "@/contexts/CreditContext";
import { useRouter, usePathname } from "next/navigation";

type MediaType = "video" | "sound";

interface GeneratedMedia {
  id: string;
  name: string;
  thumbnail?: string;
  duration: string;
}

interface MediaGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: MediaType;
  onMediaGenerated: (media: GeneratedMedia) => void;
}

export function MediaGeneratorModal({
  open,
  onOpenChange,
  mediaType,
  onMediaGenerated,
}: MediaGeneratorModalProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<GeneratedMedia | null>(
    null
  );
  const [playingMedia, setPlayingMedia] = useState<string | null>(null);
  const { credits, useCredit } = useCredits();
  const router = useRouter();
  const pathname = usePathname();

  const isVideo = mediaType === "video";
  const Icon = isVideo ? Video : Music;

  const handleGenerate = () => {
    if (credits === 0) return;

    useCredit();
    setIsGenerating(true);
    setGeneratedMedia([]);
    setSelectedMedia(null);
    setPlayingMedia(null);

    // Mock generation
    setTimeout(() => {
      const mockGenerated: GeneratedMedia[] = isVideo
        ? [
            {
              id: "gen-v1",
              name: "Generated Video 1.mp4",
              thumbnail:
                "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop",
              duration: "0:15",
            },
            {
              id: "gen-v2",
              name: "Generated Video 2.mp4",
              thumbnail:
                "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=300&fit=crop",
              duration: "0:20",
            },
            {
              id: "gen-v3",
              name: "Generated Video 3.mp4",
              thumbnail:
                "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop",
              duration: "0:12",
            },
          ]
        : [
            { id: "gen-s1", name: "Generated Track 1.mp3", duration: "0:30" },
            { id: "gen-s2", name: "Generated Track 2.mp3", duration: "0:45" },
            { id: "gen-s3", name: "Generated Track 3.mp3", duration: "0:25" },
          ];
      setGeneratedMedia(mockGenerated);
      setIsGenerating(false);
    }, 2000);
  };

  const handleConfirmSelection = () => {
    if (selectedMedia) {
      onMediaGenerated(selectedMedia);
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setAiPrompt("");
    setGeneratedMedia([]);
    setSelectedMedia(null);
    setPlayingMedia(null);
  };

  const togglePlayMedia = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingMedia(playingMedia === id ? null : id);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate {isVideo ? "Video" : "Sound"} with AI
          </DialogTitle>
          <DialogDescription>
            {generatedMedia.length > 0
              ? `Select your preferred ${isVideo ? "video" : "sound"}`
              : `Describe the ${
                  isVideo ? "video" : "sound"
                } you want to create`}
          </DialogDescription>
        </DialogHeader>

        {credits === 0 ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    No credits available
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You need credits to generate {isVideo ? "videos" : "sounds"}{" "}
                    with AI.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="hero"
              className="w-full"
              onClick={() => {
                handleClose();
                router.push(`/pricing?from=${encodeURIComponent(pathname)}`);
              }}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Get Credits
            </Button>
          </div>
        ) : generatedMedia.length > 0 ? (
          <div className="space-y-4">
            {isVideo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {generatedMedia.map((media, index) => (
                    <motion.div
                      key={media.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedMedia(media)}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${
                        selectedMedia?.id === media.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={media.thumbnail}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Play button overlay */}
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => togglePlayMedia(media.id, e)}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                          {playingMedia === media.id ? (
                            <Pause className="w-5 h-5 text-foreground" />
                          ) : (
                            <Play className="w-5 h-5 text-foreground ml-0.5" />
                          )}
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                        {media.duration}
                      </div>
                      {selectedMedia?.id === media.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Video Preview Player */}
                {selectedMedia && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        variant={
                          playingMedia === selectedMedia.id
                            ? "default"
                            : "outline"
                        }
                        size="icon"
                        className="w-10 h-10 rounded-lg shrink-0"
                        onClick={(e) => togglePlayMedia(selectedMedia.id, e)}
                      >
                        {playingMedia === selectedMedia.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {selectedMedia.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Duration: {selectedMedia.duration}
                        </p>
                      </div>
                      <img
                        src={selectedMedia.thumbnail}
                        alt=""
                        className="w-16 h-10 rounded object-cover"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {generatedMedia.map((media, index) => (
                    <motion.div
                      key={media.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedMedia(media)}
                      className={`p-3 rounded-xl cursor-pointer border-2 transition-colors flex items-center gap-3 ${
                        selectedMedia?.id === media.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 bg-muted/50"
                      }`}
                    >
                      {/* Play button */}
                      <Button
                        variant={
                          playingMedia === media.id ? "default" : "outline"
                        }
                        size="icon"
                        className="w-10 h-10 rounded-lg shrink-0"
                        onClick={(e) => togglePlayMedia(media.id, e)}
                      >
                        {playingMedia === media.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {media.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {media.duration}
                        </p>
                      </div>
                      {/* Waveform */}
                      <div className="w-20 h-6 flex items-center gap-0.5">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-primary/40 rounded-full"
                            style={{ height: `${Math.random() * 16 + 4}px` }}
                            animate={
                              playingMedia === media.id
                                ? {
                                    height: [
                                      `${Math.random() * 16 + 4}px`,
                                      `${Math.random() * 20 + 4}px`,
                                      `${Math.random() * 16 + 4}px`,
                                    ],
                                  }
                                : {}
                            }
                            transition={{
                              duration: 0.3,
                              repeat: playingMedia === media.id ? Infinity : 0,
                              delay: i * 0.05,
                            }}
                          />
                        ))}
                      </div>
                      {selectedMedia?.id === media.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleGenerate}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleConfirmSelection}
                disabled={!selectedMedia}
              >
                Use Selected
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              placeholder={
                isVideo
                  ? "A cinematic product reveal with smooth camera movement and professional lighting..."
                  : "An upbeat electronic track with energetic beats, perfect for product ads..."
              }
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                This will generate 3 options (1 credit)
              </span>
              <span className="text-foreground font-medium">
                {credits} credits available
              </span>
            </div>
            <Button
              variant="hero"
              className="w-full"
              onClick={handleGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 mr-2"
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  Generating 3 options...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {isVideo ? "Videos" : "Sounds"}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
