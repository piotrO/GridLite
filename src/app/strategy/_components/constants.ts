import { Target, Users, Zap, LucideIcon } from "lucide-react";

export const STRATEGY_OPTIONS: Record<
  string,
  { title: string; description: string; icon: LucideIcon }
> = {
  AWARENESS: {
    title: "Brand Awareness Campaign",
    description:
      "High-impact display ads across premium networks to maximize visibility",
    icon: Target,
  },
  CONVERSION: {
    title: "Conversion-Focused",
    description:
      "Retargeting ads with strong CTAs to drive immediate purchases",
    icon: Zap,
  },
  ENGAGEMENT: {
    title: "Social Engagement",
    description: "Interactive ad formats designed for social media platforms",
    icon: Users,
  },
};

export const STATUS_MESSAGES: Record<string, string> = {
  scanning_website: "Scanning website for latest content...",
  analyzing_content: "Extracting campaign insights...",
  generating_strategy: "Sarah is crafting your strategy...",
};
