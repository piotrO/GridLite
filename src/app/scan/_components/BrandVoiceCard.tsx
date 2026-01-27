"use client";

import { motion } from "framer-motion";
import { MessageSquareText } from "lucide-react";
import { ThePlaybook } from "./ThePlaybook";
import { VoiceToneSection } from "./VoiceToneSection";
import { LinguisticMechanics } from "./LinguisticMechanics";

interface BrandVoiceCardProps {
  voiceLabel: string;
  voiceInstructions: string;
  dos: string[];
  donts: string[];
  linguisticMechanics?: {
    formality_index: "High" | "Low";
    urgency_level: "High" | "Low";
    etymology_bias: "Latinate" | "Germanic";
  };
  delay?: number;
}

export function BrandVoiceCard({
  voiceLabel,
  voiceInstructions,
  dos,
  donts,
  linguisticMechanics,
  delay = 0.6,
}: BrandVoiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-6">
        <MessageSquareText className="w-5 h-5 text-researcher" />
        <h3 className="font-semibold text-foreground">Brand Voice</h3>
      </div>

      <div className="space-y-8">
        {/* Tone & Instructions */}
        <VoiceToneSection
          voiceLabel={voiceLabel}
          voiceInstructions={voiceInstructions}
        />

        {/* Playbook: Dos & Don'ts */}
        <ThePlaybook dos={dos} donts={donts} />

        {/* Linguistic Mechanics */}
        <div className="pt-4 border-t border-border/50">
          <LinguisticMechanics linguisticMechanics={linguisticMechanics} />
        </div>
      </div>
    </motion.div>
  );
}
