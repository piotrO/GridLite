"use client";

import { motion } from "framer-motion";
import { Palette, Type } from "lucide-react";
import { ColorPicker } from "@/components/ColorPicker";
import { BrandPalette } from "@/lib/shared/types";

interface ColorsTypographyCardProps {
  palette: BrandPalette;
  font: string;
  onPaletteChange: (palette: BrandPalette) => void;
  onFontClick: () => void;
  delay?: number;
}

export function ColorsTypographyCard({
  palette,
  font,
  onPaletteChange,
  onFontClick,
  delay = 0.4,
}: ColorsTypographyCardProps) {
  const handlePrimaryChange = (color: string) => {
    onPaletteChange({ ...palette, primary: color });
  };

  const handleSecondaryChange = (color: string) => {
    onPaletteChange({ ...palette, secondary: color });
  };

  const handleAccentChange = (color: string) => {
    onPaletteChange({ ...palette, accent: color });
  };

  const handleExtraColorChange = (index: number, color: string) => {
    const extraColors = [...(palette.extraColors || [])];
    extraColors[index] = color;
    onPaletteChange({ ...palette, extraColors });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-researcher" />
        <h3 className="font-semibold text-foreground">Colors & Typography</h3>
      </div>
      <div className="space-y-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Primary Palette
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <ColorPicker
              color={palette.primary}
              onChange={handlePrimaryChange}
            />
            <p className="text-[9px] font-medium text-center text-muted-foreground">
              Primary
            </p>
          </div>
          <div className="space-y-2">
            <ColorPicker
              color={palette.secondary}
              onChange={handleSecondaryChange}
            />
            <p className="text-[9px] font-medium text-center text-muted-foreground">
              Secondary
            </p>
          </div>
          <div className="space-y-2">
            <ColorPicker color={palette.accent} onChange={handleAccentChange} />
            <p className="text-[9px] font-medium text-center text-muted-foreground">
              Accent
            </p>
          </div>
        </div>
      </div>

      {palette.extraColors && palette.extraColors.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Extra Brand Colors
          </p>
          <div className="flex flex-wrap gap-3">
            {palette.extraColors.map((color, i) => (
              <ColorPicker
                key={i}
                color={color}
                onChange={(newColor) => handleExtraColorChange(i, newColor)}
              />
            ))}
          </div>
        </div>
      )}
      <div
        className="flex items-center gap-2 p-2 -m-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
        onClick={onFontClick}
      >
        <Type className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
          {font}
        </span>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          Click to change
        </span>
      </div>
    </motion.div>
  );
}
