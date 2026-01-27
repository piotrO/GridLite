import { useState } from "react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const presetColors = [
  "#4F46E5",
  "#7C3AED",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#FBBF24",
  "#84CC16",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#000000",
  "#374151",
  "#6B7280",
  "#FFFFFF",
];

export function ColorPicker({
  color,
  onChange,
  disabled = false,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(color);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <motion.button
          whileHover={disabled ? {} : { scale: 1.1 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          className={`w-full h-10 rounded-lg shadow-md border-2 border-border transition-colors ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-primary/50 cursor-pointer"
          }`}
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 bg-card border-2 border-border"
        align="start"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-8 gap-1.5">
            {presetColors.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => {
                  onChange(presetColor);
                  setInputValue(presetColor);
                }}
                className={`w-6 h-6 rounded-md border transition-all hover:scale-110 ${
                  color === presetColor
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
                style={{ backgroundColor: presetColor }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg border-2 border-border shrink-0"
              style={{ backgroundColor: color }}
            />
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="#000000"
              className="font-mono text-sm h-10"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
