import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  CreditCard,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/contexts/CreditContext";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ImageCard } from "@/components/ImageCard";
import { AssetToolbar } from "@/components/AssetToolbar";

type GridSize = "small" | "medium" | "large";

interface ImageBrowserProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  selectedImage?: string | null;
  onSelectImage?: (imageUrl: string) => void;
  selectable?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  showRename?: boolean;
}

const sizeConfig: Record<GridSize, { cols: string }> = {
  small: { cols: "grid-cols-4 md:grid-cols-5 lg:grid-cols-6" },
  medium: { cols: "grid-cols-3 md:grid-cols-4" },
  large: { cols: "grid-cols-2 md:grid-cols-3" },
};

export function ImageBrowser({
  images,
  onImagesChange,
  selectedImage,
  onSelectImage,
  selectable = false,
  showHeader = true,
  maxHeight = "400px",
  showRename = false,
}: ImageBrowserProps) {
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<string | null>(
    null
  );
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  const [imageNames, setImageNames] = useState<Record<string, string>>({});
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const { credits, useCredit } = useCredits();
  const router = useRouter();
  const pathname = usePathname();

  const handleUpload = () => {
    const newImage = `https://images.unsplash.com/photo-${Date.now()}?w=400&h=400&fit=crop`;
    onImagesChange([newImage, ...images]);
  };

  const handleDelete = (imageUrl: string) => {
    onImagesChange(images.filter((img) => img !== imageUrl));
  };

  const handleGenerateAI = () => {
    if (credits === 0) return;
    useCredit();
    setIsGenerating(true);
    setGeneratedImages([]);
    setSelectedGenerated(null);

    setTimeout(() => {
      const mockGeneratedImages = [
        `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop`,
        `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop`,
        `https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=400&fit=crop`,
      ];
      setGeneratedImages(mockGeneratedImages);
      setIsGenerating(false);
    }, 2000);
  };

  const handleConfirmSelection = () => {
    if (selectedGenerated) {
      onImagesChange([selectedGenerated, ...images]);
      setShowAIModal(false);
      setAiPrompt("");
      setGeneratedImages([]);
      setSelectedGenerated(null);
    }
  };

  const handleCloseModal = () => {
    setShowAIModal(false);
    setAiPrompt("");
    setGeneratedImages([]);
    setSelectedGenerated(null);
  };

  const getImageName = (url: string) => {
    if (imageNames[url]) return imageNames[url];
    const urlParts = url.split("/");
    return (
      urlParts[urlParts.length - 1].split("?")[0] ||
      `Image ${images.indexOf(url) + 1}`
    );
  };

  const handleRenameImage = (url: string) => {
    setRenameTarget({ url, name: getImageName(url) });
    setRenameName(getImageName(url));
    setShowRenameModal(true);
  };

  const handleRenameConfirm = () => {
    if (renameTarget && renameName.trim()) {
      setImageNames({ ...imageNames, [renameTarget.url]: renameName.trim() });
      setShowRenameModal(false);
      setRenameTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Upload, AI Generate & Size Controls */}
      {showHeader && (
        <AssetToolbar
          onGenerateAI={() => setShowAIModal(true)}
          onUpload={handleUpload}
          showSizeControls={true}
          gridSize={gridSize}
          onGridSizeChange={setGridSize}
        />
      )}

      {/* AI Generation Modal */}
      <Dialog open={showAIModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate with AI
            </DialogTitle>
            <DialogDescription>
              {generatedImages.length > 0
                ? "Select your preferred image"
                : "Describe the image you want to create"}
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
                      You need credits to generate images with AI.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="hero"
                className="w-full"
                onClick={() => {
                  handleCloseModal();
                  router.push(`/pricing?from=${encodeURIComponent(pathname)}`);
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Get Credits
              </Button>
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {generatedImages.map((img, index) => (
                  <motion.div
                    key={img}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedGenerated(img)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedGenerated === img
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Generated option ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedGenerated === img && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleGenerateAI}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleConfirmSelection}
                  disabled={!selectedGenerated}
                >
                  Use Selected
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="A professional product photo of a smartphone on a marble surface with soft lighting..."
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
                onClick={handleGenerateAI}
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
                    Generate Images
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div
          className={cn(
            "grid gap-3 overflow-y-auto pr-2",
            "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30",
            "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
            sizeConfig[gridSize].cols
          )}
          style={{ maxHeight }}
        >
          <AnimatePresence>
            {images.map((image, index) => (
              <ImageCard
                key={image}
                src={image}
                selected={selectedImage === image}
                selectable={selectable}
                onClick={() => selectable && onSelectImage?.(image)}
                onDelete={() => handleDelete(image)}
                onRename={
                  showRename ? () => handleRenameImage(image) : undefined
                }
                delay={index}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No images yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Upload images or generate with AI to get started.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setShowAIModal(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
            <Button variant="hero" onClick={handleUpload}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      )}

      {/* Image Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Image</DialogTitle>
            <DialogDescription>
              Enter a new name for this image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Enter image name..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={handleRenameConfirm}
                disabled={!renameName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
