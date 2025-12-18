"use client";

import { motion } from "framer-motion";
import { Clock, Pencil, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BrandKitCardProps {
  id: string;
  name: string;
  logo: string;
  industry: string;
  tagline: string;
  colors: string[];
  createdAt: Date;
  isActive?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  delay?: number;
}

export function BrandKitCard({
  id,
  name,
  logo,
  industry,
  tagline,
  colors,
  createdAt,
  isActive = false,
  onClick,
  onEdit,
  onDelete,
  delay = 0,
}: BrandKitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`group relative bg-card rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
        isActive
          ? "border-primary shadow-lg"
          : "border-border hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      {/* Color Bar */}
      <div className="h-3 flex">
        {colors.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
              {logo}
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {name}
              </h3>
              <p className="text-xs text-muted-foreground">{industry}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="iconSm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Brand Kit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {tagline}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {colors.slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {createdAt.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          Active
        </div>
      )}
    </motion.div>
  );
}
