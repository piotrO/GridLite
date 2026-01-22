"use client";

import { motion } from "framer-motion";
import { LucideIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  actionVariant?: "hero" | "default" | "outline";
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  onAction,
  actionDisabled = false,
  actionLoading = false,
  actionVariant = "hero",
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          variant={actionVariant}
          size="lg"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <ActionIcon className="w-5 h-5 mr-2" />
          )}
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

