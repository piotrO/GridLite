"use client";

import { motion } from "framer-motion";
import { Play, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoCardProps {
  id: string;
  name: string;
  thumbnail: string;
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export function VideoCard({
  id,
  name,
  thumbnail,
  onClick,
  onDelete,
  onRename,
}: VideoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-video bg-muted relative">
        <img
          src={thumbnail}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-foreground ml-0.5" />
          </div>
        </div>
        {/* Action buttons */}
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
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
      </div>
    </motion.div>
  );
}
