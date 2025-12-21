"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FontCardProps {
  name: string;
  category: string;
  onClick?: () => void;
  onDelete?: () => void;
}

export function FontCard({ name, category, onClick, onDelete }: FontCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group p-4 rounded-xl bg-card border-2 border-border hover:border-primary/50 transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-foreground" style={{ fontFamily: name }}>
          {name}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
            {category}
          </span>
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      <p
        className="text-2xl text-muted-foreground"
        style={{ fontFamily: name }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
    </motion.div>
  );
}
