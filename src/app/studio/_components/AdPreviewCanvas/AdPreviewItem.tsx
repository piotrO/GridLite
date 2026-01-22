import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAdPreviewBlob } from "@/hooks/useAdPreviewBlob";
import type { AdPreviewItemProps } from "./types";

export const AdPreviewItem = ({
  size,
  templatePath,
  data,
  reloadKey,
  onIframeRef,
}: AdPreviewItemProps) => {
  // Filter layer modifications for this specific size
  // Apply if: sizes is undefined, includes "all", or includes this size.id
  const filteredLayerMods = useMemo(() => {
    if (!data.layerModifications) return [];
    return data.layerModifications.filter((mod) => {
      // No sizes specified = apply to all
      if (!mod.sizes || mod.sizes.length === 0) return true;
      // Check if "all" is in sizes or this specific size is included
      return mod.sizes.includes("all") || mod.sizes.includes(size.id);
    });
  }, [data.layerModifications, size.id]);

  // Stringify arrays for stable dependency comparison
  const layerModsJson = JSON.stringify(filteredLayerMods);
  const colorsJson = JSON.stringify(data.colors || []);

  // Memoize the data object to prevent unnecessary re-renders
  const previewData = useMemo(
    () => ({
      headline: data.headline,
      bodyCopy: data.bodyCopy,
      ctaText: data.ctaText,
      imageUrl: data.imageUrl,
      logoUrl: data.logoUrl,
      colors: data.colors,
      layerModifications: filteredLayerMods,
    }),
    [
      data.headline,
      data.bodyCopy,
      data.ctaText,
      data.imageUrl,
      data.logoUrl,
      colorsJson,
      layerModsJson,
      filteredLayerMods,
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

  // Calculate scale to fit within 400x400 max display area
  const scale = Math.min(400 / size.width, 400 / size.height, 1);

  // Container should match the scaled iframe dimensions
  const containerWidth = size.width * scale;
  const containerHeight = size.height * scale;

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
          width: containerWidth,
          height: containerHeight,
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
