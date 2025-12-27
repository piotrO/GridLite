"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { EditableText } from "@/components/EditableText";

interface BrandIdentityCardProps {
  logo: string;
  businessName: string;
  shortName?: string;
  url: string;
  industry: string;
  tagline: string;
  brandSummary?: string;
  onBusinessNameChange: (name: string) => void;
  onShortNameChange?: (shortName: string) => void;
  onUrlChange: (url: string) => void;
  onTaglineChange: (tagline: string) => void;
  delay?: number;
}

export function BrandIdentityCard({
  logo,
  businessName,
  shortName,
  url,
  industry,
  tagline,
  brandSummary,
  onBusinessNameChange,
  onShortNameChange,
  onUrlChange,
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
          <EditableText
            value={businessName}
            onChange={onBusinessNameChange}
            className="font-semibold text-foreground"
          />
          <p className="text-xs text-muted-foreground">{industry}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
            <Globe className="w-3 h-3" />
            URL
          </label>
          <EditableText
            value={url}
            onChange={onUrlChange}
            className="text-sm text-researcher"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground shrink-0">
            Tagline
          </label>
          <EditableText
            value={tagline}
            onChange={onTaglineChange}
            className="text-sm"
          />
        </div>
        {brandSummary && brandSummary.length > 0 && (
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground shrink-0 pt-0.5">
              About
            </label>
            <p className="text-sm text-foreground">{brandSummary}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
