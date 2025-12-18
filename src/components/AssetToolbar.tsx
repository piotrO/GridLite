"use client";

import { ReactNode } from "react";
import { Upload, Sparkles, Grid3X3, LayoutGrid, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type GridSize = "small" | "medium" | "large";

interface AssetToolbarProps {
  onGenerateAI?: () => void;
  onUpload?: () => void;
  showSizeControls?: boolean;
  gridSize?: GridSize;
  onGridSizeChange?: (size: GridSize) => void;
  children?: ReactNode;
}

export function AssetToolbar({
  onGenerateAI,
  onUpload,
  showSizeControls = false,
  gridSize = "medium",
  onGridSizeChange,
  children,
}: AssetToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        {onGenerateAI && (
          <Button variant="outline" size="sm" onClick={onGenerateAI}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI
          </Button>
        )}
        {onUpload && (
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        )}
        {children}
      </div>

      {showSizeControls && onGridSizeChange && (
        <ToggleGroup
          type="single"
          value={gridSize}
          onValueChange={(value) =>
            value && onGridSizeChange(value as GridSize)
          }
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem
            value="small"
            aria-label="Small grid"
            className="h-8 w-8 p-0"
          >
            <Grid3X3 className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="medium"
            aria-label="Medium grid"
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="large"
            aria-label="Large grid"
            className="h-8 w-8 p-0"
          >
            <Grid2X2 className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      )}
    </div>
  );
}
