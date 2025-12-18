"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StrategyOptionCard } from "./StrategyOptionCard";
import { AdFormatsPreview } from "./AdFormatsPreview";

interface StrategyOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
}

interface StrategyOptionsPanelProps {
  brandName: string;
  options: StrategyOption[];
  showOptions: boolean;
  onToggleOption: (id: string) => void;
  onApprove: () => void;
}

export function StrategyOptionsPanel({
  brandName,
  options,
  showOptions,
  onToggleOption,
  onApprove,
}: StrategyOptionsPanelProps) {
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-strategist" />
              <span>Recommended strategies for {brandName}</span>
            </div>

            {options.map((option, index) => (
              <StrategyOptionCard
                key={option.id}
                id={option.id}
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={option.selected}
                onSelect={() => onToggleOption(option.id)}
                delay={0.4 + index * 0.1}
              />
            ))}

            <AdFormatsPreview />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={onApprove}
                variant="hero"
                size="xl"
                className="w-full"
              >
                <span>Approve & Start Creating</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
