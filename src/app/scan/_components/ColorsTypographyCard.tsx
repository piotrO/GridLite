"use client";

import { motion } from "framer-motion";
import { Palette, Type } from "lucide-react";
import { ColorPicker } from "@/components/ColorPicker";

interface ColorsTypographyCardProps {
  colors: string[];
  font: string;
  onColorsChange: (colors: string[]) => void;
  onFontClick: () => void;
  delay?: number;
}

export function ColorsTypographyCard({
  colors,
  font,
  onColorsChange,
  onFontClick,
  delay = 0.4,
}: ColorsTypographyCardProps) {
  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onColorsChange(newColors);
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
      <div className="flex gap-2 mb-4">
        {colors.map((color, i) => (
          <ColorPicker
            key={i}
            color={color}
            onChange={(newColor) => handleColorChange(i, newColor)}
          />
        ))}
      </div>
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
