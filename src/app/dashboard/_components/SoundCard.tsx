"use client";

import { motion } from "framer-motion";
import { Play, Pause, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SoundCardProps {
  id: string;
  name: string;
  duration: string;
  isPlaying?: boolean;
  onTogglePlay: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export function SoundCard({
  id,
  name,
  duration,
  isPlaying = false,
  onTogglePlay,
  onDelete,
  onRename,
}: SoundCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group p-4 rounded-xl bg-card border-2 border-border hover:border-primary/50 transition-shadow flex items-center gap-4"
    >
      {/* Play button */}
      <Button
        variant={isPlaying ? "default" : "outline"}
        size="icon"
        className="w-12 h-12 rounded-xl shrink-0"
        onClick={onTogglePlay}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        <p className="text-sm text-muted-foreground">{duration}</p>
      </div>

      {/* Waveform visualization */}
      <div className="w-32 h-8 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
        <div className="flex gap-0.5">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary/40 rounded-full"
              style={{ height: `${Math.random() * 20 + 8}px` }}
              animate={
                isPlaying
                  ? {
                      height: [
                        `${Math.random() * 20 + 8}px`,
                        `${Math.random() * 24 + 4}px`,
                        `${Math.random() * 20 + 8}px`,
                      ],
                    }
                  : {}
              }
              transition={{
                duration: 0.3,
                repeat: isPlaying ? Infinity : 0,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onRename && (
          <Button
            variant="secondary"
            size="icon"
            className="w-8 h-8 rounded-full"
            onClick={onRename}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="icon"
            className="w-8 h-8 rounded-full"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
