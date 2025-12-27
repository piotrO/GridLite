"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIdentityCard } from "./BrandIdentityCard";
import { ColorsTypographyCard } from "./ColorsTypographyCard";
import { BrandVoiceCard } from "./BrandVoiceCard";
import { TargetAudiencesCard } from "./TargetAudiencesCard";

interface BrandData {
  name: string;
  shortName?: string;
  url: string;
  industry: string;
  tagline: string;
  logo: string;
  colors: string[];
  font: string;
  tone: string;
  personality: string[];
  brandSummary?: string;
  audiences: { name: string; description: string }[];
}

interface BrandDataPanelProps {
  brandData: BrandData;
  showBrandData: boolean;
  onBrandDataChange: (data: BrandData) => void;
  onFontClick: () => void;
  onApprove: () => void;
  onSaveToDashboard: () => void;
  onReanalyze?: () => void;
}

export function BrandDataPanel({
  brandData,
  showBrandData,
  onBrandDataChange,
  onFontClick,
  onApprove,
  onSaveToDashboard,
  onReanalyze,
}: BrandDataPanelProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showBrandData && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-researcher" />
              <span>Scanned brand profile for {brandData.name}</span>
            </div>
            <BrandIdentityCard
              logo={brandData.logo}
              businessName={brandData.name}
              shortName={brandData.shortName}
              url={brandData.url}
              industry={brandData.industry}
              tagline={brandData.tagline}
              brandSummary={brandData.brandSummary}
              onBusinessNameChange={(name) =>
                onBrandDataChange({ ...brandData, name })
              }
              onShortNameChange={(shortName) =>
                onBrandDataChange({ ...brandData, shortName })
              }
              onUrlChange={(url) => onBrandDataChange({ ...brandData, url })}
              onTaglineChange={(tagline) =>
                onBrandDataChange({ ...brandData, tagline })
              }
            />

            <ColorsTypographyCard
              colors={brandData.colors}
              font={brandData.font}
              onColorsChange={(colors) =>
                onBrandDataChange({ ...brandData, colors })
              }
              onFontClick={onFontClick}
            />

            <BrandVoiceCard
              tone={brandData.tone}
              personality={brandData.personality}
            />

            <TargetAudiencesCard audiences={brandData.audiences} />

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              <Button
                onClick={onApprove}
                variant="hero"
                size="xl"
                className="w-full"
              >
                <Check className="w-5 h-5 mr-2" />
                <span>Approve & Meet The Strategist</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={onSaveToDashboard}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Save Brand Kit
                </Button>
                {onReanalyze && (
                  <Button
                    onClick={onReanalyze}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reanalyze
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
