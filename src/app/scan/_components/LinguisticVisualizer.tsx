"use client";

import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface LinguisticVisualizerProps {
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
}

export function LinguisticVisualizer({
  personalityDimensions,
  linguisticMechanics,
}: LinguisticVisualizerProps) {
  const radarData = personalityDimensions
    ? [
        { subject: "Sincerity", value: personalityDimensions.sincerity },
        { subject: "Excitement", value: personalityDimensions.excitement },
        { subject: "Competence", value: personalityDimensions.competence },
        {
          subject: "Sophistication",
          value: personalityDimensions.sophistication,
        },
        { subject: "Ruggedness", value: personalityDimensions.ruggedness },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px]">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest self-start mb-2">
          Aaker's Personality dimensions
        </h4>
        {radarData.length > 0 ? (
          <div className="w-full h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(0,0,0,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 500 }}
                />
                <Radar
                  name="Brand Profile"
                  dataKey="value"
                  stroke="var(--researcher)"
                  fill="var(--researcher)"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-10">
            Analysis data unavailable
          </div>
        )}
      </div>

      {/* Linguistic Mechanics Bars */}
      {linguisticMechanics && (
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
            leftLabel="Anglo-Saxon"
            rightLabel="Latinate"
          />
        </div>
      )}
    </div>
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
