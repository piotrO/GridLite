"use client";

import { Lightbulb, Target, BarChart3, Brain } from "lucide-react";
import {
  AIProcessingLoadingState,
  ProcessingStep,
} from "@/components/AIProcessingLoadingState";

interface StrategyLoadingStateProps {
  status: string;
  brandName?: string;
}

const strategySteps: ProcessingStep[] = [
  {
    id: "scanning_website",
    icon: Target,
    label: "Scanning website",
    color: "text-researcher",
  },
  {
    id: "analyzing_content",
    icon: BarChart3,
    label: "Extracting insights",
    color: "text-designer",
  },
  {
    id: "generating_strategy",
    icon: Brain,
    label: "Crafting strategy",
    color: "text-strategist",
  },
];

// Map status messages to step IDs
const STATUS_TO_STEP: Record<string, string> = {
  "Connecting with The Strategist...": "",
  "Analyzing your brand...": "",
  "Scanning website for latest content...": "scanning_website",
  "Extracting campaign insights...": "analyzing_content",
  "Sarah is crafting your strategy...": "generating_strategy",
  "Working on it...": "analyzing_content",
};

export function StrategyLoadingState({
  status,
  brandName = "your brand",
}: StrategyLoadingStateProps) {
  const currentStepId = STATUS_TO_STEP[status] || "";

  return (
    <AIProcessingLoadingState
      currentStepId={currentStepId}
      steps={strategySteps}
      entityName={brandName}
      actionLabel="Strategizing for:"
      colorVar="strategist"
      orbColors="from-strategist via-designer to-accent"
      activeBorderColor="border-strategist/50"
      progressGradient="from-strategist to-accent"
      CentralIcon={Lightbulb}
    />
  );
}
