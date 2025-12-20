import { motion } from "framer-motion";
import { Globe, Sparkles, Zap, Target } from "lucide-react";

interface ScanningAnimationProps {
  url: string;
  onComplete: () => void;
  currentStep?: string;
}

const scanSteps = [
  {
    id: "extracting_text",
    icon: Globe,
    label: "Extracting website text",
    color: "text-primary",
  },
  {
    id: "extracting_logo",
    icon: Sparkles,
    label: "Finding brand logo",
    color: "text-designer",
  },
  {
    id: "analyzing_colors",
    icon: Target,
    label: "Analyzing brand colors",
    color: "text-strategist",
  },
  {
    id: "analyzing_ai",
    icon: Zap,
    label: "AI brand analysis",
    color: "text-accent",
  },
];

export function ScanningAnimation({
  url,
  onComplete,
  currentStep,
}: ScanningAnimationProps) {
  // Determine which steps are completed
  const currentStepIndex = currentStep
    ? scanSteps.findIndex((step) => step.id === currentStep)
    : -1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[400px] space-y-8"
    >
      {/* Central scanning orb */}
      <div className="relative">
        <motion.div
          className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-designer to-accent"
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
          className="absolute inset-0 w-32 h-32 rounded-full border-4 border-primary/30"
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
        <Globe className="absolute inset-0 m-auto w-12 h-12 text-primary-foreground" />
      </div>

      {/* URL being scanned */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-6 py-3 rounded-xl bg-card border-2 border-border shadow-md"
      >
        <span className="text-muted-foreground text-sm">Scanning: </span>
        <span className="font-semibold text-foreground">{url}</span>
      </motion.div>

      {/* Scan steps */}
      <div className="space-y-3 w-full max-w-sm">
        {scanSteps.map((step, index) => {
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
                  ? "bg-secondary border-2 border-primary/50"
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
                  className="ml-auto h-1 bg-gradient-to-r from-primary to-accent rounded-full max-w-16"
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
  );
}
