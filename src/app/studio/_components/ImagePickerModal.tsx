import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageBrowser } from "@/components/ImageBrowser";

interface ImagePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string) => void;
  title?: string;
}

const mockImages = [
  "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1491553895911-0055uj3hG04?w=400&h=400&fit=crop",
];

export function ImagePickerModal({
  open,
  onOpenChange,
  onSelect,
  title = "Select Image",
}: ImagePickerModalProps) {
  const [images, setImages] = useState(mockImages);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      onOpenChange(false);
      setSelectedImage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-2 border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <ImageBrowser
            images={images}
            onImagesChange={setImages}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
            selectable={true}
            maxHeight="350px"
          />
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="hero"
            onClick={handleConfirm}
            disabled={!selectedImage}
          >
            Select Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
