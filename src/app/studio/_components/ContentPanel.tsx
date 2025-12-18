import { useState } from "react";
import { Type, FileText, MousePointer, Image, Plus } from "lucide-react";
import { EditableText } from "@/components/EditableText";
import { EditableTextarea } from "@/components/EditableTextarea";
import { ImagePickerModal } from "@/components/ImagePickerModal";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { FormLabel } from "@/components/FormLabel";

interface ContentData {
  headline: string;
  bodyCopy: string;
  ctaText: string;
  imageUrl: string;
}

interface ContentPanelProps {
  content: ContentData;
  onChange: (content: ContentData) => void;
}

export function ContentPanel({ content, onChange }: ContentPanelProps) {
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleChange = (field: keyof ContentData, value: string) => {
    onChange({ ...content, [field]: value });
  };

  return (
    <>
      <ImagePickerModal
        open={showImagePicker}
        onOpenChange={setShowImagePicker}
        onSelect={(imageUrl) => handleChange("imageUrl", imageUrl)}
        title="Select Campaign Image"
      />

      <CollapsiblePanel title="Content" icon={Type}>
        <div className="space-y-4">
          {/* Headline */}
          <div className="space-y-1">
            <FormLabel icon={Type}>Headline</FormLabel>
            <EditableText
              value={content.headline}
              onChange={(value) => handleChange("headline", value)}
              placeholder="Enter headline..."
              className="text-base"
            />
          </div>

          {/* Body Copy */}
          <div className="space-y-1">
            <FormLabel icon={FileText}>Body Copy</FormLabel>
            <EditableTextarea
              value={content.bodyCopy}
              onChange={(value) => handleChange("bodyCopy", value)}
              placeholder="Enter body copy..."
            />
          </div>

          {/* CTA Text */}
          <div className="space-y-1">
            <FormLabel icon={MousePointer}>CTA Text</FormLabel>
            <EditableText
              value={content.ctaText}
              onChange={(value) => handleChange("ctaText", value)}
              placeholder="Shop Now"
              className="text-sm"
            />
          </div>

          {/* Image Preview */}
          <div className="space-y-2">
            <FormLabel icon={Image}>Image</FormLabel>
            <button
              onClick={() => setShowImagePicker(true)}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all overflow-hidden"
            >
              {content.imageUrl ? (
                <div className="relative group">
                  <img
                    src={content.imageUrl}
                    alt="Campaign"
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/400x200?text=Image";
                    }}
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 flex items-center justify-center transition-colors">
                    <span className="text-primary-foreground text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-foreground/60 px-3 py-1 rounded-full">
                      Change Image
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Add Image</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </CollapsiblePanel>
    </>
  );
}
