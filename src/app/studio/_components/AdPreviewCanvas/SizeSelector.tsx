import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AD_SIZES } from "./constants";

interface SizeSelectorProps {
  selectedSizes: string[];
  onToggleSize: (sizeId: string) => void;
}

export const SizeSelector = ({
  selectedSizes,
  onToggleSize,
}: SizeSelectorProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Sizes
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2 bg-card border-2 border-border"
        align="end"
      >
        <div className="space-y-1">
          {AD_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => onToggleSize(size.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                selectedSizes.includes(size.id)
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                    selectedSizes.includes(size.id)
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}
                >
                  {selectedSizes.includes(size.id) && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <span>{size.label}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {size.id}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
