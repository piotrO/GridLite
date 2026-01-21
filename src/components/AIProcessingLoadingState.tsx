"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";

export interface ProcessingStep {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

interface AIProcessingLoadingStateProps {
  /** Current step ID to determine which step is active */
  currentStepId: string;
  /** Array of steps to display */
  steps: ProcessingStep[];
  /** Brand or entity name being processed */
  entityName: string;
  /** Action label (e.g., "Scanning", "Strategizing for", "Designing for") */
  actionLabel: string;
  /** Gradient background color variable */
  colorVar: "researcher" | "strategist" | "designer";
  /** Central orb gradient colors */
  orbColors: string;
  /** Border color for active step */
  activeBorderColor: string;
  /** Gradient colors for progress bar */
  progressGradient: string;
  /** Central icon in the orb */
  CentralIcon: LucideIcon;
}

export function AIProcessingLoadingState({
  currentStepId,
  steps,
  entityName,
  actionLabel,
  colorVar,
  orbColors,
  activeBorderColor,
  progressGradient,
  CentralIcon,
}: AIProcessingLoadingStateProps) {
  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      <GradientBackground colorVar={colorVar} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] space-y-8 relative z-10"
      >
        {/* Central animated orb */}
        <div className="relative">
          <motion.div
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${orbColors}`}
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className={`absolute inset-0 w-32 h-32 rounded-full border-4 border-${colorVar}/30`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.8, 0, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-0 w-32 h-32 rounded-full border-4 border-accent/30"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
          <CentralIcon className="absolute inset-0 m-auto w-12 h-12 text-primary-foreground" />
        </div>

        {/* Entity being processed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-6 py-3 rounded-xl bg-card border-2 border-border shadow-md"
        >
          <span className="text-muted-foreground text-sm">{actionLabel} </span>
          <span className="font-semibold text-foreground">{entityName}</span>
        </motion.div>

        {/* Processing steps */}
        <div className="space-y-3 w-full max-w-sm">
          {steps.map((step, index) => {
            const isCompleted = currentStepIndex > index;
            const isActive = currentStepIndex === index;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.2 }}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isActive
                    ? `bg-secondary border-2 ${activeBorderColor}`
                    : isCompleted
                    ? "bg-secondary/30"
                    : "bg-secondary/50"
                }`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.2, type: "spring" }}
                  className={isActive ? "animate-pulse" : ""}
                >
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </motion.div>
                <span
                  className={`text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? "text-foreground font-semibold"
                      : isCompleted
                      ? "text-muted-foreground line-through"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`ml-auto h-1 bg-gradient-to-r ${progressGradient} rounded-full max-w-16`}
                  />
                )}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <span className="text-white text-xs">✓</span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
