"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { PERSONALITY_DESCRIPTIONS } from "./constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PersonalityRadarProps {
  personalityDimensions?: {
    sincerity: number;
    excitement: number;
    competence: number;
    sophistication: number;
    ruggedness: number;
  };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const description = PERSONALITY_DESCRIPTIONS[data.subject];

    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="font-bold text-xs text-foreground">
            {data.subject}
          </span>
          <span className="text-[10px] font-mono bg-researcher/10 text-researcher px-1.5 py-0.5 rounded">
            {data.value.toFixed(1)}/5.0
          </span>
        </div>
        {description && (
          <p className="text-[10px] text-muted-foreground leading-tight max-w-[180px]">
            {description}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const CustomTick = (props: any) => {
  const { x, y, payload, personalityDimensions, cx, cy } = props;
  const subject = payload.value;
  const value = personalityDimensions?.[subject.toLowerCase()] || 0;
  const description = PERSONALITY_DESCRIPTIONS[subject];

  // Calculate direction from center to push labels out slightly
  const dx = x - cx;
  const dy = y - cy;
  const factorX = 1.4;
  const factorY  = 1.1;
  const nx = cx + dx * factorX;
  const ny = cy + dy * factorY;

  return (
    <g transform={`translate(${nx},${ny})`}>
      <foreignObject
        x="-50"
        y="-15"
        width="100"
        height="30"
        className="overflow-visible"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-[10px] font-medium text-foreground text-center cursor-help hover:text-researcher transition-colors whitespace-nowrap py-1 pointer-events-auto">
              {subject}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="p-3 border-border shadow-lg z-[100]"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="font-bold text-xs text-foreground">
                  {subject}
                </span>
                <span className="text-[10px] font-mono bg-researcher/10 text-researcher px-1.5 py-0.5 rounded">
                  {value.toFixed(1)}/5.0
                </span>
              </div>
              {description && (
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[180px]">
                  {description}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </foreignObject>
    </g>
  );
};

export function PersonalityRadar({
  personalityDimensions,
}: PersonalityRadarProps) {
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
    <TooltipProvider delayDuration={100}>
      <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center min-h-[260px]">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest self-start mb-2">
          Aaker's Personality dimensions
        </h4>
        {radarData.length > 0 ? (
          <div className="w-full h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="80%"
                data={radarData}
                className="overflow-visible"
              >
                <PolarGrid stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={
                    <CustomTick personalityDimensions={personalityDimensions} />
                  }
                />
                <PolarRadiusAxis
                  domain={[0, 5]}
                  tick={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#a855f7", strokeWidth: 1 }}
                />
                <Radar
                  name="Brand Profile"
                  dataKey="value"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.5}
                  strokeWidth={2}
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
    </TooltipProvider>
  );
}
