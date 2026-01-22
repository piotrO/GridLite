"use client";

import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";

interface AddNewCardProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  minHeight?: string;
  delay?: number;
}

export function AddNewCard({
  label,
  onClick,
  disabled = false,
  loading = false,
  minHeight = "240px",
  delay = 0,
}: AddNewCardProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={isDisabled ? undefined : onClick}
      className={`group bg-card/50 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-card transition-shadow cursor-pointer flex items-center justify-center ${
        isDisabled ? "opacity-50 pointer-events-none" : ""
      }`}
      style={{ minHeight }}
    >
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-colors">
          {loading ? (
            <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
          ) : (
            <Plus className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
        <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

