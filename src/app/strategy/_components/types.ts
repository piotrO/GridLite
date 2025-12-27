import { LucideIcon } from "lucide-react";
import { PersonaType } from "@/components/ChatInterface";

export interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

export interface StrategyOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
}

export interface StrategyData {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  adFormats: string[];
  targetingTips: string[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BrandProfile {
  name: string;
  shortName?: string;
  url: string;
  industry?: string;
  tagline?: string;
  brandSummary?: string;
  tone?: string;
  personality?: string[];
  colors?: string[];
  audiences?: { name: string; description: string }[];
}
