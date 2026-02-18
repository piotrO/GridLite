"use client";

import { motion } from "framer-motion";
import { Palette } from "lucide-react";
import { BrandPalette } from "@/lib/shared/types";
import { PrimaryPaletteSection } from "./PrimaryPaletteSection";
import { ExtraColorsSection } from "./ExtraColorsSection";
import { Typography } from "@/lib/shared/types";
import { TypographySection } from "@/components/TypographySection";

interface ColorsTypographyCardProps {
  palette: BrandPalette;
  font: string;
  typography?: Typography | null;
  onPaletteChange: (palette: BrandPalette) => void;
  onFontClick: () => void;
  delay?: number;
}

export function ColorsTypographyCard({
  palette,
  font,
  typography,
  onPaletteChange,
  onFontClick,
  delay = 0.4,
}: ColorsTypographyCardProps) {
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

      <div className="space-y-6">
        <PrimaryPaletteSection
          palette={palette}
          onPaletteChange={onPaletteChange}
        />

        <ExtraColorsSection
          palette={palette}
          onPaletteChange={onPaletteChange}
        />

        <div className="pt-2 border-t border-border/50">
          <TypographySection
            font={font}
            typography={typography}
            onFontClick={onFontClick}
          />
        </div>
      </div>
    </motion.div>
  );
}
