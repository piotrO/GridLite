"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { ArchetypeDisplay } from "./ArchetypeDisplay";
import { PersonalityTraits } from "./PersonalityTraits";
import { PersonalityRadar } from "./PersonalityRadar";

interface BrandPsychologyCardProps {
  personality?: string[];
  personalityDimensions?: {
    sincerity: number;
    excitement: number;
    competence: number;
    sophistication: number;
    ruggedness: number;
  };
  archetype?: {
    primary: string;
    secondary: string;
    brand_motivation: string;
  };
  delay?: number;
}

export function BrandPsychologyCard({
  personality = [],
  personalityDimensions,
  archetype,
  delay = 0.5,
}: BrandPsychologyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-5 h-5 text-researcher" />
        <h3 className="font-semibold text-foreground">Brand Psychology</h3>
      </div>

      <div className="space-y-8">
        <ArchetypeDisplay archetype={archetype} />

        <PersonalityTraits personality={personality} />

        <div className="pt-4 border-t border-border/50">
          <PersonalityRadar personalityDimensions={personalityDimensions} />
        </div>
      </div>
    </motion.div>
  );
}
