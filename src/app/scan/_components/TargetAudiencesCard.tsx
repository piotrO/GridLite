"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";

interface Audience {
  name: string;
  description: string;
}

interface TargetAudiencesCardProps {
  audiences: Audience[];
  delay?: number;
}

export function TargetAudiencesCard({
  audiences,
  delay = 0.6,
}: TargetAudiencesCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-researcher" />
        <h3 className="font-semibold text-foreground">Target Audiences</h3>
      </div>
      <div className="space-y-3">
        {audiences.map((audience, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-researcher/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-researcher">{i + 1}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {audience.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {audience.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
