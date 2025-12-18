"use client";

import { motion } from "framer-motion";

interface BrandVoiceCardProps {
  tone: string;
  personality: string[];
  delay?: number;
}

export function BrandVoiceCard({
  tone,
  personality,
  delay = 0.5,
}: BrandVoiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border"
    >
      <h3 className="font-semibold text-foreground mb-3">Brand Voice</h3>
      <p className="text-sm text-muted-foreground mb-3">{tone}</p>
      <div className="flex flex-wrap gap-2">
        {personality.map((trait, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full bg-researcher/10 text-researcher text-xs font-medium border border-researcher/30"
          >
            {trait}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
