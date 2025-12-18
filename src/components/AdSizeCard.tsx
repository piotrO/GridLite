"use client";

import { motion } from "framer-motion";
import { FileArchive, Download, CheckCircle2 } from "lucide-react";

interface AdSize {
  id: string;
  name: string;
  dimensions: string;
}

interface DownloadableAssetCardProps {
  size: AdSize;
  isSelected: boolean;
  onToggle: () => void;
}

export function DownloadableAssetCard({
  size,
  isSelected,
  onToggle,
}: DownloadableAssetCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`p-4 rounded-xl border-2 text-left transition-shadow ${
        isSelected
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-lg bg-muted">
          <FileArchive className="w-5 h-5 text-muted-foreground" />
        </div>
        {isSelected ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Download className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <p className="font-medium text-foreground text-sm">{size.id}.zip</p>
      <p className="text-xs text-muted-foreground">{size.name}</p>
    </motion.button>
  );
}

interface AdSizeDisplayProps {
  size: AdSize;
}

export function AdSizeDisplay({ size }: AdSizeDisplayProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
      <span className="font-medium text-foreground">{size.name}</span>
      <span className="text-sm text-muted-foreground">{size.dimensions}</span>
    </div>
  );
}
