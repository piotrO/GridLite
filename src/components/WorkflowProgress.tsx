"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface WorkflowStep {
  id: string;
  label: string;
  status: StepStatus;
  startTime?: number;
  endTime?: number;
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  title?: string;
  subtitle?: string;
  colorVar?: "researcher" | "strategist" | "designer";
}

const colorConfig = {
  researcher: {
    text: "text-researcher",
    bg: "bg-researcher/5",
    border: "border-researcher",
    sparkle: "text-researcher",
    gradientFrom: "from-researcher",
    gradientTo: "to-designer",
    bgGradient: "bg-gradient-to-r from-researcher to-purple-500",
  },
  strategist: {
    text: "text-strategist",
    bg: "bg-strategist/5",
    border: "border-strategist",
    sparkle: "text-strategist",
    gradientFrom: "from-strategist",
    gradientTo: "to-researcher",
    bgGradient: "bg-gradient-to-r from-strategist to-orange-500",
  },
  designer: {
    text: "text-designer",
    bg: "bg-designer/5",
    border: "border-designer",
    sparkle: "text-designer",
    gradientFrom: "from-designer",
    gradientTo: "to-strategist",
    bgGradient: "bg-gradient-to-r from-designer to-pink-500",
  },
};

export function WorkflowProgress({
  steps,
  title = "Processing...",
  subtitle,
  colorVar = "researcher",
}: WorkflowProgressProps) {
  // Calculate progress percentage
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  // If the last step is running, we're basically done, let's say 95%
  const lastStepIsRunning =
    steps.length > 0 && steps[steps.length - 1].status === "running";

  // Progress is completed steps
  let progressPercent =
    totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;

  // Boost progress for running step feel
  if (totalSteps > 0 && !lastStepIsRunning && completedSteps < totalSteps) {
    progressPercent += (1 / totalSteps) * 20; // Add 20% of a step width
  }
  if (lastStepIsRunning) {
    progressPercent = 95;
  }

  // Force 100% if all steps completed
  if (completedSteps === totalSteps && totalSteps > 0) {
    progressPercent = 100;
  }

  // Live timer for running step
  const [elapsed, setElapsed] = useState(0);
  const runningStep = steps.find((s) => s.status === "running");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runningStep?.startTime) {
      const start = runningStep.startTime;
      // Update immediately
      setElapsed((Date.now() - start) / 1000);
      interval = setInterval(() => {
        setElapsed((Date.now() - start) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [runningStep]);

  // Auto-scroll to bottom of list
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      // Smooth scroll to keep the active item in view
      const activeItem = listRef.current.querySelector(
        '[data-status="running"]',
      );
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [steps, runningStep?.id]);

  // Add keyframes for the stronger dot animation
  // Dynamic color based on colorVar
  const colorHex =
    colorVar === "strategist"
      ? "hsl(var(--strategist))"
      : colorVar === "designer"
        ? "hsl(var(--designer))"
        : "hsl(var(--researcher))";

  const dotAnimation = `
@keyframes strongPulse {
  0%, 100% { opacity: 0.1; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.4); font-weight: bold; color: ${colorHex}; }
}
`;

  const theme = colorConfig[colorVar] || colorConfig.researcher;

  // If no steps yet (initializing), show a skeletal state
  if (steps.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center justify-center space-x-3 text-muted-foreground/80 animate-pulse">
          <Sparkles className={cn("w-5 h-5", theme.sparkle)} />
          <span
            className={cn(
              "font-medium text-sm bg-clip-text text-transparent",
              theme.bgGradient,
            )}
          >
            Warming up the engines...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{dotAnimation}</style>
      <div className="w-full max-w-2xl mx-auto p-6 pt-24 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
        {/* Header & Progress Bar */}
        <div className="mb-8 space-y-4 shrink-0">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm font-mono text-muted-foreground/70 mt-1 truncate max-w-[400px]">
                  {subtitle}
                </p>
              )}
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="h-2 bg-secondary/30 rounded-full overflow-hidden w-full">
            <motion.div
              className={cn(
                "h-full bg-gradient-to-r shadow-[0_0_10px_rgba(59,130,246,0.5)]",
                theme.gradientFrom,
                theme.gradientTo,
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
              liveElapsed={step.id === runningStep?.id ? elapsed : undefined}
              colorVar={colorVar}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function StepItem({
  step,
  index,
  isLast,
  liveElapsed,
  colorVar,
}: {
  step: WorkflowStep;
  index: number;
  isLast: boolean;
  liveElapsed?: number;
  colorVar: "researcher" | "strategist" | "designer";
}) {
  const isRunning = step.status === "running";
  const isCompleted = step.status === "completed";
  const isFailed = step.status === "failed";
  const isPending = step.status === "pending";

  const theme = colorConfig[colorVar] || colorConfig.researcher;

  return (
    <motion.div
      layout
      data-status={step.status}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative border rounded-xl overflow-hidden transition-all duration-300",
        isRunning
          ? cn(
              theme.border,
              "shadow-md scale-[1.01] border-opacity-50",
              theme.bg,
            )
          : "border-border/40 bg-card/30",
        isPending && "border-border/30 bg-card/10 text-muted-foreground/80",
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Status Icon */}
        <div
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-full border bg-background shadow-sm transition-all",
            isRunning ? theme.border : "border-border",
            isPending && "border-dashed opacity-60",
          )}
        >
          {isRunning && (
            <Loader2 className={cn("w-4 h-4 animate-spin", theme.text)} />
          )}
          {isCompleted && <Check className="w-4 h-4 text-green-500" />}
          {isFailed && <X className="w-4 h-4 text-red-500" />}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3
              className={cn(
                "text-sm font-medium transition-colors",
                isRunning ? "text-foreground" : "text-muted-foreground",
                isCompleted && "text-foreground/90",
                isPending && "text-muted-foreground/70",
              )}
            >
              {step.label}
              {isRunning ? "..." : ""}
            </h3>

            {/* Timer Display */}
            {(isRunning || (isCompleted && step.startTime && step.endTime)) && (
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {isRunning
                  ? `${(liveElapsed || 0).toFixed(1)}s`
                  : `${((step.endTime! - step.startTime!) / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>

          {/* Active Log Line (simulated with dots for now, can be extended) */}
          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-1"
              >
                <div
                  className={cn(
                    "text-xs font-mono flex items-center gap-1",
                    theme.text,
                    "opacity-80",
                  )}
                >
                  <span className="font-semibold">Processing</span>
                  <span
                    style={{
                      animation: "strongPulse 1s infinite",
                      animationDelay: "0ms",
                    }}
                  >
                    .
                  </span>
                  <span
                    style={{
                      animation: "strongPulse 1s infinite",
                      animationDelay: "200ms",
                    }}
                  >
                    .
                  </span>
                  <span
                    style={{
                      animation: "strongPulse 1s infinite",
                      animationDelay: "400ms",
                    }}
                  >
                    .
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Line connecting steps */}
      {!isLast && (
        <div className="absolute left-8 bottom-0 top-12 w-px -ml-px bg-border/30 group-last:hidden" />
      )}
    </motion.div>
  );
}
