"use client";

import { Palette, Eye, Sparkles, Wand2, Image } from "lucide-react";
import {
  AIProcessingLoadingState,
  ProcessingStep,
} from "@/components/AIProcessingLoadingState";

interface DesignerLoadingStateProps {
  status: string;
  brandName?: string;
}

const designSteps: ProcessingStep[] = [
  {
    id: "analyzing_brand",
    icon: Eye,
    label: "Analyzing brand",
    color: "text-researcher",
  },
  {
    id: "reviewing_strategy",
    icon: Sparkles,
    label: "Reviewing strategy",
    color: "text-strategist",
  },
  {
    id: "creating_visuals",
    icon: Wand2,
    label: "Crafting visuals",
    color: "text-designer",
  },
  {
    id: "generating_image",
    icon: Image,
    label: "Generating image",
    color: "text-accent",
  },
];

const STATUS_TO_STEP: Record<string, string> = {
  "Connecting with The Designer...": "",
  "Analyzing brand identity...": "analyzing_brand",
  "Reviewing campaign strategy...": "reviewing_strategy",
  "Davinci is crafting your visuals...": "creating_visuals",
  "Generating hero image...": "generating_image",
  "Working on it...": "reviewing_strategy",
};

export function DesignerLoadingState({
  status,
  brandName = "your brand",
}: DesignerLoadingStateProps) {
  const currentStepId = STATUS_TO_STEP[status] || "";

  return (
    <AIProcessingLoadingState
      currentStepId={currentStepId}
      steps={designSteps}
      entityName={brandName}
      actionLabel="Designing for:"
      colorVar="designer"
      orbColors="from-designer via-accent to-strategist"
      activeBorderColor="border-designer/50"
      progressGradient="from-designer to-accent"
      CentralIcon={Palette}
    />
  );
}
