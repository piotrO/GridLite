"use client";

import { LinguisticBar } from "./LinguisticBar";

interface LinguisticMechanicsProps {
  linguisticMechanics?: {
    formality_index: "High" | "Low";
    urgency_level: "High" | "Low";
    etymology_bias: "Latinate" | "Germanic";
  };
}

export function LinguisticMechanics({
  linguisticMechanics,
}: LinguisticMechanicsProps) {
  if (!linguisticMechanics) return null;

  return (
    <div className="space-y-3 px-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Linguistic Mechanics
      </h4>
      <LinguisticBar
        label="Formality"
        value={linguisticMechanics.formality_index === "High" ? 80 : 30}
        leftLabel="Conversational"
        rightLabel="Academic"
      />
      <LinguisticBar
        label="Urgency"
        value={linguisticMechanics.urgency_level === "High" ? 80 : 30}
        leftLabel="Gentle"
        rightLabel="Aggressive"
      />
      <LinguisticBar
        label="Etymology"
        value={linguisticMechanics.etymology_bias === "Latinate" ? 80 : 30}
        leftLabel="Casual"
        rightLabel="Formal"
      />
    </div>
  );
}
