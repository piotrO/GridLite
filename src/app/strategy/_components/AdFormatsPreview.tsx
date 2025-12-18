"use client";

import { motion } from "framer-motion";

interface AdFormatsPreviewProps {
  formats?: string[];
  delay?: number;
}

const defaultFormats = ["300×250", "728×90", "160×600", "320×50"];

export function AdFormatsPreview({
  formats = defaultFormats,
  delay = 0.7,
}: AdFormatsPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-gradient-to-br from-strategist/10 to-designer/10 border border-strategist/20"
    >
      <h3 className="font-semibold text-foreground mb-3 text-sm">
        Recommended Formats
      </h3>
      <div className="flex flex-wrap gap-2">
        {formats.map((size) => (
          <span
            key={size}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono text-foreground"
          >
            {size}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
