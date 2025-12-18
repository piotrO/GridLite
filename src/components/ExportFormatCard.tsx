"use client";

import { LucideIcon, Coins } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  recommended?: boolean;
  creditCost: number;
}

interface ExportFormatCardProps {
  format: ExportFormat;
  selected: boolean;
  onToggle: () => void;
}

export function ExportFormatCard({
  format,
  selected,
  onToggle,
}: ExportFormatCardProps) {
  const Icon = format.icon;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{format.name}</span>
          {format.recommended && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              Recommended
            </span>
          )}
          {format.creditCost > 1 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 text-accent flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {format.creditCost} credits
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{format.description}</p>
      </div>
    </div>
  );
}
