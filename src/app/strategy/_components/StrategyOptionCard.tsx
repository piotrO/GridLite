"use client";

import { motion } from "framer-motion";
import { Check, LucideIcon } from "lucide-react";

interface StrategyOptionCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  delay?: number;
}

export function StrategyOptionCard({
  id,
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  delay = 0,
}: StrategyOptionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onSelect}
      className={`w-full p-5 rounded-2xl border-2 text-left transition-shadow ${
        selected
          ? "border-strategist bg-strategist/10 shadow-md"
          : "border-border bg-card hover:border-strategist/50 hover:bg-strategist/5"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            selected ? "bg-strategist" : "bg-muted"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              selected ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {selected && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-strategist text-primary-foreground font-medium">
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected
              ? "border-strategist bg-strategist"
              : "border-muted-foreground"
          }`}
        >
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
    </motion.button>
  );
}
