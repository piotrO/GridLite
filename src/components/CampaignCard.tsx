"use client";

import { motion } from "framer-motion";
import { Clock, Pencil, MoreHorizontal, Rocket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  "in-progress": {
    label: "In Progress",
    color: "bg-accent/20 text-accent-foreground",
  },
  complete: { label: "Complete", color: "bg-green-500/20 text-green-600" },
  exported: { label: "Ready to Launch", color: "bg-primary/20 text-primary" },
};

interface CampaignCardProps {
  id: string;
  name: string;
  brand: string;
  status: string;
  createdAt: Date;
  onClick: () => void;
  onLaunch?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  delay?: number;
}

export function CampaignCard({
  id,
  name,
  brand,
  status,
  createdAt,
  onClick,
  onLaunch,
  onRename,
  onDelete,
  delay = 0,
}: CampaignCardProps) {
  const statusStyle = statusConfig[status] || statusConfig.draft;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group relative bg-card rounded-2xl border-2 border-border overflow-hidden hover:border-primary/50 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
        <div className="w-24 h-20 rounded-lg bg-gradient-to-br from-accent via-gold to-accent flex flex-col items-center justify-center shadow-md">
          <span className="text-xs font-bold text-accent-foreground">SALE</span>
          <span className="text-lg font-extrabold text-accent-foreground">
            50%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">{brand}</p>
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
              {onRename && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename();
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {onDelete && (
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
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.color}`}
          >
            {statusStyle.label}
          </span>
          {status === "exported" && onLaunch ? (
            <Button
              variant="hero"
              size="sm"
              className="gap-1.5 h-7"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch();
              }}
            >
              <Rocket className="w-3 h-3" />
              Launch
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {createdAt.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
