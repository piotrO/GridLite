"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  X,
  ChevronRight,
  Terminal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface ScanStep {
  id: string;
  label: string;
  status: StepStatus;
  logs?: string[];
  startTime?: number;
  endTime?: number;
}

interface ScanProgressProps {
  steps: ScanStep[];
  currentStepId?: string;
  url?: string;
}

export function ScanProgress({ steps, currentStepId, url }: ScanProgressProps) {
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
  const dotAnimation = `
@keyframes strongPulse {
  0%, 100% { opacity: 0.1; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.4); font-weight: bold; color: hsl(var(--researcher)); }
}
`;

  // If no steps yet (initializing), show a skeletal state
  if (steps.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center justify-center space-x-3 text-muted-foreground/80 animate-pulse">
          <Sparkles className="w-5 h-5 text-researcher" />
          <span className="font-medium text-sm bg-clip-text text-transparent bg-gradient-to-r from-researcher to-purple-500">
            Warming up the engines...
          </span>
        </div>
      </div>
    );
  }

  // Inject styles for the animation
  return (
    <>
      <style>{dotAnimation}</style>
      <div className="w-full max-w-2xl mx-auto p-6 pt-24 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
        {/* Header & Progress Bar */}
        <div className="mb-8 space-y-4 shrink-0">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                Analyzing Brand Identity
              </h2>
              {url && (
                <p className="text-sm font-mono text-muted-foreground/70 mt-1 truncate max-w-[400px]">
                  {url}
                </p>
              )}
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="h-2 bg-secondary/30 rounded-full overflow-hidden w-full">
            <motion.div
              className="h-full bg-gradient-to-r from-researcher to-designer shadow-[0_0_10px_rgba(59,130,246,0.5)]"
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
}: {
  step: ScanStep;
  index: number;
  isLast: boolean;
  liveElapsed?: number;
}) {
  const isRunning = step.status === "running";
  const isCompleted = step.status === "completed";
  const isFailed = step.status === "failed";
  const isPending = step.status === "pending";

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
          ? "border-researcher/50 bg-researcher/5 shadow-md scale-[1.01]"
          : "border-border/40 bg-card/30",
        // PENDING: Brighter text (removed opacity-30), subtle border, no grayscale
        isPending && "border-border/30 bg-card/10 text-muted-foreground/80",
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Status Icon */}
        <div
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-full border bg-background shadow-sm transition-all",
            isRunning ? "border-researcher" : "border-border",
            isPending && "border-dashed opacity-60", // Slightly dimmed icon only
          )}
        >
          {isRunning && (
            <Loader2 className="w-4 h-4 text-researcher animate-spin" />
          )}
          {isCompleted && <Check className="w-4 h-4 text-green-500" />}
          {isFailed && <X className="w-4 h-4 text-red-500" />}
          {/* Pending: just an empty ring, no inner dot */}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3
              className={cn(
                "text-sm font-medium transition-colors",
                isRunning ? "text-foreground" : "text-muted-foreground", // Pending uses muted-foreground which is already decent brightness
                isCompleted && "text-foreground/90",
                isPending && "text-muted-foreground/70", // Slightly brighter than before
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

          {/* Active Log Line */}
          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-1"
              >
                <div className="text-xs text-researcher/80 font-mono flex items-center gap-1">
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
