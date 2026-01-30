"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIdentityCard } from "./BrandIdentityCard";
import { ColorsTypographyCard } from "./ColorsTypographyCard";
import { BrandPsychologyCard } from "./BrandPsychologyCard";
import { BrandVoiceCard } from "./BrandVoiceCard";
import { TargetAudiencesCard } from "./TargetAudiencesCard";
import { BrandPalette, Typography } from "@/lib/shared/types";

interface BrandData {
  name: string;
  shortName?: string;
  url: string;
  industry: string;
  tagline: string;
  logo: string;
  font: string;
  typography?: Typography | null;
  personality?: string[];
  voiceLabel: string;
  voiceInstructions: string;
  dos: string[];
  donts: string[];
  palette: BrandPalette;
  tone?: string;
  brandSummary?: string;
  audiences: { name: string; description: string }[];
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
              palette={brandData.palette}
              font={brandData.font}
              typography={brandData.typography}
              onPaletteChange={(palette) =>
                onBrandDataChange({ ...brandData, palette })
              }
              onFontClick={onFontClick}
            />

            <BrandPsychologyCard
              personality={brandData.personality || []}
              personalityDimensions={brandData.personalityDimensions}
              archetype={brandData.archetype}
              delay={0.5}
            />

            <BrandVoiceCard
              voiceLabel={brandData.voiceLabel}
              voiceInstructions={brandData.voiceInstructions}
              dos={brandData.dos}
              donts={brandData.donts}
              linguisticMechanics={brandData.linguisticMechanics}
              delay={0.6}
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
                    type="button"
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
