"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  src: string;
  alt?: string;
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  showActions?: boolean;
  className?: string;
  aspectRatio?: "square" | "video";
  delay?: number;
}

export function ImageCard({
  src,
  alt = "Image",
  selected = false,
  selectable = false,
  onClick,
  onDelete,
  onRename,
  showActions = true,
  className,
  aspectRatio = "square",
  delay = 0,
}: ImageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: delay * 0.02 }}
      className={cn(
        "group relative rounded-xl overflow-hidden border-2 transition-all",
        selectable ? "cursor-pointer" : "",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50",
        className
      )}
      style={{ paddingBottom: aspectRatio === "square" ? "100%" : "56.25%" }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://via.placeholder.com/400?text=Image";
        }}
      />

      {/* Selected Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* Hover Overlay with Actions */}
      {showActions && (onDelete || onRename) && (
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDelete && (
              <Button
                variant="destructive"
                size="icon"
                className="w-6 h-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
            {onRename && (
              <Button
                variant="secondary"
                size="icon"
                className="w-6 h-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
