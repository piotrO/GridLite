"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/components/EditableText";

interface BrandIdentityCardProps {
  logo: string;
  name: string;
  industry: string;
  tagline: string;
  onNameChange: (name: string) => void;
  onTaglineChange: (tagline: string) => void;
  delay?: number;
}

export function BrandIdentityCard({
  logo,
  name,
  industry,
  tagline,
  onNameChange,
  onTaglineChange,
  delay = 0.3,
}: BrandIdentityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-researcher/20 flex items-center justify-center overflow-hidden">
          {logo.startsWith("http") || logo.startsWith("/") ? (
            <img
              src={logo}
              alt="Brand logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = "🏢";
              }}
            />
          ) : (
            <span className="text-lg">{logo}</span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Brand Identity</h3>
          <p className="text-xs text-muted-foreground">{industry}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Business Name
          </label>
          <EditableText
            value={name}
            onChange={onNameChange}
            className="text-base"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tagline
          </label>
          <EditableText
            value={tagline}
            onChange={onTaglineChange}
            className="text-sm"
          />
        </div>
      </div>
    </motion.div>
  );
}
