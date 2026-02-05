"use client";

import { motion } from "framer-motion";
import {
  Image,
  ShoppingBag,
  Video,
  Megaphone,
  type LucideIcon,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignTypeId = "display" | "dpa" | "video" | "social";

export interface CampaignType {
  id: CampaignTypeId;
  name: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "new" | "coming-soon" | "beta";
  disabled?: boolean;
  colorVar: string;
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    id: "display",
    name: "Display Ads",
    description: "Brand awareness campaigns with stunning visuals",
    icon: Image,
    colorVar: "primary",
  },
  {
    id: "dpa",
    name: "Dynamic Product Ads",
    description: "Personalized ads from your product catalog",
    icon: ShoppingBag,
    badge: "New",
    badgeVariant: "new",
    colorVar: "accent",
  },
  {
    id: "video",
    name: "Video Ads",
    description: "Engaging video content for social platforms",
    icon: Video,
    badge: "Coming Soon",
    badgeVariant: "coming-soon",
    disabled: true,
    colorVar: "designer",
  },
  {
    id: "social",
    name: "Social Media",
    description: "Optimized creatives for social platforms",
    icon: Megaphone,
    badge: "Coming Soon",
    badgeVariant: "coming-soon",
    disabled: true,
    colorVar: "researcher",
  },
];

interface CampaignTypeSelectorProps {
  selectedType: CampaignTypeId | null;
  onSelect: (type: CampaignTypeId) => void;
  className?: string;
}

export function CampaignTypeSelector({
  selectedType,
  onSelect,
  className,
}: CampaignTypeSelectorProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Choose Your Campaign Type</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          What would you like to create?
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select the type of advertising campaign that best fits your goals
        </p>
      </motion.div>

      {/* Campaign Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {CAMPAIGN_TYPES.map((type, index) => (
          <CampaignTypeCard
            key={type.id}
            type={type}
            isSelected={selectedType === type.id}
            onSelect={() => !type.disabled && onSelect(type.id)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface CampaignTypeCardProps {
  type: CampaignType;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function CampaignTypeCard({
  type,
  isSelected,
  onSelect,
  index,
}: CampaignTypeCardProps) {
  const Icon = type.icon;

  const getBadgeStyles = (variant?: string) => {
    switch (variant) {
      case "new":
        return "bg-accent text-accent-foreground";
      case "beta":
        return "bg-gold text-gold-foreground";
      case "coming-soon":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  const getColorStyles = (colorVar: string, isSelected: boolean) => {
    const base = {
      primary: {
        icon: "bg-primary/10 text-primary",
        ring: "ring-primary/30",
        glow: "shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]",
      },
      accent: {
        icon: "bg-accent/10 text-accent",
        ring: "ring-accent/30",
        glow: "shadow-[0_0_30px_-5px_hsl(var(--accent)/0.3)]",
      },
      designer: {
        icon: "bg-designer/10 text-designer",
        ring: "ring-designer/30",
        glow: "shadow-[0_0_30px_-5px_hsl(var(--designer)/0.3)]",
      },
      researcher: {
        icon: "bg-researcher/10 text-researcher",
        ring: "ring-researcher/30",
        glow: "shadow-[0_0_30px_-5px_hsl(var(--researcher)/0.3)]",
      },
    };

    return base[colorVar as keyof typeof base] || base.primary;
  };

  const colorStyles = getColorStyles(type.colorVar, isSelected);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      onClick={onSelect}
      disabled={type.disabled}
      className={cn(
        "relative group w-full text-left p-6 rounded-2xl border-2 transition-all duration-300",
        "bg-card hover:bg-card/80",
        type.disabled
          ? "opacity-50 cursor-not-allowed border-border"
          : "cursor-pointer hover:-translate-y-1",
        isSelected
          ? cn("border-transparent ring-2", colorStyles.ring, colorStyles.glow)
          : "border-border hover:border-muted-foreground/30",
      )}
    >
      {/* Badge */}
      {type.badge && (
        <div
          className={cn(
            "absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold",
            getBadgeStyles(type.badgeVariant),
          )}
        >
          {type.badge}
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 left-4"
        >
          <CheckCircle2 className="w-5 h-5 text-success" />
        </motion.div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-4">
        {/* Icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
            colorStyles.icon,
            isSelected && "scale-110",
          )}
        >
          <Icon className="w-7 h-7" />
        </div>

        {/* Text */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {type.name}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {type.description}
          </p>
        </div>
      </div>

      {/* Hover Effect */}
      {!type.disabled && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
            "bg-gradient-to-br from-transparent via-transparent to-muted/5",
          )}
        />
      )}
    </motion.button>
  );
}

export { CAMPAIGN_TYPES };
