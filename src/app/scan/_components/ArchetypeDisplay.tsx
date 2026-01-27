"use client";

import {
  Zap,
  Sparkles,
  ShieldCheck,
  Heart,
  Laugh,
  Users,
  HeartHandshake,
  Crown,
  Palette,
  Sun,
  BookOpen,
  Compass,
  Info,
} from "lucide-react";

export const ARCHETYPE_ICONS: Record<string, any> = {
  "The Outlaw": Zap,
  "The Magician": Sparkles,
  "The Hero": ShieldCheck,
  "The Lover": Heart,
  "The Jester": Laugh,
  "The Everyman": Users,
  "The Caregiver": HeartHandshake,
  "The Ruler": Crown,
  "The Creator": Palette,
  "The Innocent": Sun,
  "The Sage": BookOpen,
  "The Explorer": Compass,
};

interface ArchetypeDisplayProps {
  archetype?: {
    primary: string;
    secondary: string;
    brand_motivation: string;
  };
}

export function ArchetypeDisplay({ archetype }: ArchetypeDisplayProps) {
  const PrimaryIcon = archetype?.primary
    ? ARCHETYPE_ICONS[archetype.primary] || Info
    : Info;
  const SecondaryIcon = archetype?.secondary
    ? ARCHETYPE_ICONS[archetype.secondary] || Info
    : Info;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Primary Archetype
          </h4>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-researcher/5 border border-researcher/10">
            <div className="w-8 h-8 rounded-lg bg-researcher/10 flex items-center justify-center">
              <PrimaryIcon className="w-4 h-4 text-researcher" />
            </div>
            <span className="text-xs font-semibold">
              {archetype?.primary || "N/A"}
            </span>
          </div>
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Secondary Archetype
          </h4>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <SecondaryIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold">
              {archetype?.secondary || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {archetype?.brand_motivation && (
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-[11px] leading-relaxed text-muted-foreground italic">
            "{archetype.brand_motivation}"
          </p>
        </div>
      )}
    </div>
  );
}
