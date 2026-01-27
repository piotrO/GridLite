"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Pencil,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandPalette } from "@/lib/shared/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BrandKitCardProps {
  id: string;
  name: string;
  logo: string;
  industry: string;
  tagline: string;
  palette: BrandPalette;
  createdAt: Date;
  isActive?: boolean;
  needsReanalysis?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReanalyze?: () => void;
  delay?: number;
}

export function BrandKitCard({
  id,
  name,
  logo,
  industry,
  tagline,
  palette,
  createdAt,
  isActive = false,
  needsReanalysis = false,
  onClick,
  onEdit,
  onDelete,
  onReanalyze,
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
          : needsReanalysis
            ? "border-amber-500/50 hover:border-amber-500"
            : "border-border hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      {/* Color Bar */}
      <div className="h-3 flex">
        <div
          className="flex-1"
          style={{ backgroundColor: palette.primary }}
          title="Primary"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: palette.secondary }}
          title="Secondary"
        />
        <div
          className="flex-1"
          style={{ backgroundColor: palette.accent }}
          title="Accent"
        />
        {palette.extraColors?.map((color, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: color }}
            title={`Extra ${i + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl overflow-hidden">
              {logo.startsWith("http") || logo.startsWith("/") ? (
                <img
                  src={logo}
                  alt={`${name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      "🏢";
                  }}
                />
              ) : (
                logo
              )}
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
              {onReanalyze && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onReanalyze();
                    }}
                    className={needsReanalysis ? "text-amber-600" : ""}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reanalyze Brand
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
            <div
              className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: palette.primary }}
              title="Primary"
            />
            <div
              className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: palette.secondary }}
              title="Secondary"
            />
            <div
              className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: palette.accent }}
              title="Accent"
            />
            {palette.extraColors?.slice(0, 1).map((color, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: color }}
                title="Extra"
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

      {/* Needs Reanalysis indicator */}
      {needsReanalysis && !isActive && (
        <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 text-xs font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Needs Setup
        </div>
      )}
    </motion.div>
  );
}
