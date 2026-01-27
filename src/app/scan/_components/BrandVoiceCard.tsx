"use client";

import { motion } from "framer-motion";
import { ArchetypeDisplay } from "./ArchetypeDisplay";
import { LinguisticVisualizer } from "./LinguisticVisualizer";
import { ThePlaybook } from "./ThePlaybook";
import { PersonalityTraits } from "./PersonalityTraits";

interface BrandVoiceCardProps {
  voiceLabel: string;
  voiceInstructions: string;
  dos: string[];
  donts: string[];
  personality?: string[];
  personalityDimensions?: {
    sincerity: number;
    excitement: number;
    competence: number;
    sophistication: number;
    ruggedness: number;
  };
  linguisticMechanics?: {
    formality_index: "High" | "Low";
    urgency_level: "High" | "Low";
    etymology_bias: "Latinate" | "Germanic";
  };
  archetype?: {
    primary: string;
    secondary: string;
    brand_motivation: string;
  };
  delay?: number;
}

export function BrandVoiceCard({
  voiceLabel,
  voiceInstructions,
  dos,
  donts,
  personality = [],
  personalityDimensions,
  linguisticMechanics,
  archetype,
  delay = 0.5,
}: BrandVoiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          Brand Voice & Psychology
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Tone & Personality Traits + Archetypes */}
        <div className="space-y-4">
          <ArchetypeDisplay archetype={archetype} />

          <div>
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Linguistic Tone:{" "}
              <span className="text-foreground">{voiceLabel}</span>
            </h4>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground leading-relaxed">
                {voiceInstructions}
              </p>
            </div>
          </div>

          <ThePlaybook dos={dos} donts={donts} />

          <PersonalityTraits personality={personality} />
        </div>

        {/* Right Column: Radar Chart + Linguistic Mechanics */}
        <LinguisticVisualizer
          personalityDimensions={personalityDimensions}
          linguisticMechanics={linguisticMechanics}
        />
      </div>
    </motion.div>
  );
}
function LinguisticBar({
  label,
  value,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground px-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-researcher relative z-10"
        />
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-0" />
      </div>
    </div>
  );
}
