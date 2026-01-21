"use client";

import { Globe, Sparkles, Target, Zap } from "lucide-react";
import {
  AIProcessingLoadingState,
  ProcessingStep,
} from "@/components/AIProcessingLoadingState";

interface ScanningAnimationProps {
  url: string;
  onComplete: () => void;
  currentStep?: string;
}

const scanSteps: ProcessingStep[] = [
  {
    id: "extracting_text",
    icon: Globe,
    label: "Extracting text",
    color: "text-primary",
  },
  {
    id: "extracting_logo",
    icon: Sparkles,
    label: "Finding logo",
    color: "text-designer",
  },
  {
    id: "analyzing_colors",
    icon: Target,
    label: "Analyzing colors",
    color: "text-strategist",
  },
  {
    id: "analyzing_ai",
    icon: Zap,
    label: "AI analysis",
    color: "text-accent",
  },
];

export function ScanningAnimation({
  url,
  currentStep = "",
}: ScanningAnimationProps) {
  return (
    <AIProcessingLoadingState
      currentStepId={currentStep}
      steps={scanSteps}
      entityName={url}
      actionLabel="Scanning:"
      colorVar="researcher"
      orbColors="from-primary via-designer to-accent"
      activeBorderColor="border-primary/50"
      progressGradient="from-primary to-accent"
      CentralIcon={Globe}
    />
  );
}
