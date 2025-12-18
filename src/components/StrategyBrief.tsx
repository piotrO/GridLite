import { motion } from "framer-motion";
import { Check, TrendingUp, Target, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StrategyBriefProps {
  brand: {
    name: string;
    industry?: string;
  };
  onApprove: () => void;
}

export function StrategyBrief({ brand, onApprove }: StrategyBriefProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto p-8 space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow"
        >
          <TrendingUp className="w-8 h-8 text-primary-foreground" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-foreground"
        >
          Campaign Strategy for {brand.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground"
        >
          Prepared by The Strategist • AI-Powered Analysis
        </motion.p>
      </div>

      {/* Strategy Cards */}
      <div className="grid gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-card border-2 border-border shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-strategist/20 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-strategist" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Campaign Objective</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Drive awareness and conversions for {brand.name}'s summer promotion through 
                high-impact display advertising across premium networks.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-2xl bg-card border-2 border-border shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-designer/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-designer" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Target Audience</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Value-conscious consumers aged 25-45, interested in quality products at 
                competitive prices. Primarily mobile-first users with high purchase intent.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 rounded-2xl bg-card border-2 border-border shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Creative Approach</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Bold, attention-grabbing visuals with clear value proposition. Animated elements 
                to increase engagement. Strong CTA buttons with urgency messaging.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ad Formats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20"
      >
        <h3 className="font-semibold text-foreground mb-4">Recommended Ad Formats</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { size: "300×250", name: "Medium Rectangle" },
            { size: "728×90", name: "Leaderboard" },
            { size: "160×600", name: "Wide Skyscraper" },
          ].map((format, index) => (
            <div
              key={format.size}
              className="p-3 rounded-xl bg-card border border-border text-center"
            >
              <div className="font-mono text-sm font-semibold text-foreground">
                {format.size}
              </div>
              <div className="text-xs text-muted-foreground">{format.name}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Approval CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex justify-center"
      >
        <Button onClick={onApprove} variant="hero" size="xl">
          <Check className="w-5 h-5 mr-2" />
          Approve Strategy & Start Creating
        </Button>
      </motion.div>
    </motion.div>
  );
}
