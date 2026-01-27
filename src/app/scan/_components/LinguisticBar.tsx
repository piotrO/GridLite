"use client";

import { motion } from "framer-motion";

interface LinguisticBarProps {
  label: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
}

export function LinguisticBar({
  label,
  value,
  leftLabel,
  rightLabel,
}: LinguisticBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground px-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-researcher relative z-10"
        />
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-0" />
      </div>
    </div>
  );
}
