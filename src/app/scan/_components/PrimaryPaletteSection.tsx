"use client";

import { ColorPicker } from "@/components/ColorPicker";
import { BrandPalette } from "@/lib/shared/types";

interface PrimaryPaletteSectionProps {
  palette: BrandPalette;
  onPaletteChange: (palette: BrandPalette) => void;
}

export function PrimaryPaletteSection({
  palette,
  onPaletteChange,
}: PrimaryPaletteSectionProps) {
  const handlePrimaryChange = (color: string) => {
    onPaletteChange({ ...palette, primary: color });
  };

  const handleSecondaryChange = (color: string) => {
    onPaletteChange({ ...palette, secondary: color });
  };

  const handleAccentChange = (color: string) => {
    onPaletteChange({ ...palette, accent: color });
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        Primary Palette
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <ColorPicker color={palette.primary} onChange={handlePrimaryChange} />
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
  );
}
