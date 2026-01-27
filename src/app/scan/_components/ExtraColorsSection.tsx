"use client";

import { ColorPicker } from "@/components/ColorPicker";
import { BrandPalette } from "@/lib/shared/types";

interface ExtraColorsSectionProps {
  palette: BrandPalette;
  onPaletteChange: (palette: BrandPalette) => void;
}

export function ExtraColorsSection({
  palette,
  onPaletteChange,
}: ExtraColorsSectionProps) {
  const handleExtraColorChange = (index: number, color: string) => {
    const extraColors = [...(palette.extraColors || [])];
    extraColors[index] = color;
    onPaletteChange({ ...palette, extraColors });
  };

  if (!palette.extraColors || palette.extraColors.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        Extra Brand Colors
      </p>
      <div className="grid grid-cols-3 gap-4">
        {palette.extraColors.slice(0, 2).map((color, i) => (
          <div key={i} className="space-y-2">
            <ColorPicker
              color={color}
              onChange={(newColor) => handleExtraColorChange(i, newColor)}
            />
            <p className="text-[9px] font-medium text-center text-muted-foreground">
              Extra {i + 1}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
