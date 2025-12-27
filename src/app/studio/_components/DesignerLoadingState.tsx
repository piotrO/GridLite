"use client";

import { motion } from "framer-motion";
import { Palette, Eye, Sparkles, Wand2 } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";

interface DesignerLoadingStateProps {
  status: string;
  brandName?: string;
}

const designSteps = [
  {
    id: "analyzing_brand",
    icon: Eye,
    label: "Analyzing brand identity",
    color: "text-researcher",
  },
  {
    id: "reviewing_strategy",
    icon: Sparkles,
    label: "Reviewing campaign strategy",
    color: "text-strategist",
  },
  {
    id: "creating_visuals",
    icon: Wand2,
    label: "Davinci is crafting your visuals",
    color: "text-designer",
  },
];

const STATUS_TO_STEP: Record<string, string> = {
  "Connecting with The Designer...": "",
  "Analyzing brand identity...": "analyzing_brand",
  "Reviewing campaign strategy...": "reviewing_strategy",
  "Davinci is crafting your visuals...": "creating_visuals",
  "Working on it...": "reviewing_strategy",
};

export function DesignerLoadingState({
  status,
  brandName = "your brand",
}: DesignerLoadingStateProps) {
  const currentStepId = STATUS_TO_STEP[status] || "";
  const currentStepIndex = designSteps.findIndex(
    (step) => step.id === currentStepId
  );

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      <GradientBackground colorVar="designer" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] space-y-8 relative z-10"
      >
        {/* Central animated orb */}
        <div className="relative">
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-designer via-accent to-strategist"
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
            className="absolute inset-0 w-32 h-32 rounded-full border-4 border-designer/30"
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
          <Palette className="absolute inset-0 m-auto w-12 h-12 text-primary-foreground" />
        </div>

        {/* Brand being designed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-6 py-3 rounded-xl bg-card border-2 border-border shadow-md"
        >
          <span className="text-muted-foreground text-sm">Designing for: </span>
          <span className="font-semibold text-foreground">{brandName}</span>
        </motion.div>

        {/* Design steps */}
        <div className="space-y-3 w-full max-w-sm">
          {designSteps.map((step, index) => {
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
                    ? "bg-secondary border-2 border-designer/50"
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
                  className={`text-sm font-medium ${
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
                    className="ml-auto h-1 bg-gradient-to-r from-designer to-accent rounded-full max-w-16"
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

        {/* Persona indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Sparkles className="w-4 h-4 text-designer" />
          <span>Davinci is crafting your creative direction</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
