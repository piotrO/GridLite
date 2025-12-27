"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, LucideIcon, Quote } from "lucide-react";
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

interface StrategyData {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  adFormats: string[];
  targetingTips: string[];
}

interface StrategyOptionsPanelProps {
  brandName: string;
  options: StrategyOption[];
  showOptions: boolean;
  onToggleOption: (id: string) => void;
  onApprove: () => void;
  strategyData?: StrategyData | null;
}

export function StrategyOptionsPanel({
  brandName,
  options,
  showOptions,
  onToggleOption,
  onApprove,
  strategyData,
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
              <span>Strategy recommendation for {brandName}</span>
            </div>

            {/* Strategy Preview Card */}
            {strategyData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-2xl bg-gradient-to-br from-strategist/10 to-strategist/5 border-2 border-strategist/30"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-strategist">
                      Campaign Angle
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {strategyData.campaignAngle}
                  </h3>

                  <div className="pt-2 border-t border-strategist/20 space-y-2">
                    <div className="flex items-start gap-2">
                      <Quote className="w-4 h-4 text-strategist mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {strategyData.headline}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {strategyData.subheadline}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-strategist/20 text-strategist text-sm font-medium">
                      {strategyData.callToAction}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Strategy Options */}
            {options.map((option, index) => (
              <StrategyOptionCard
                key={option.id}
                id={option.id}
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={option.selected}
                onSelect={() => onToggleOption(option.id)}
                delay={0.5 + index * 0.1}
              />
            ))}

            <AdFormatsPreview formats={strategyData?.adFormats} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
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
