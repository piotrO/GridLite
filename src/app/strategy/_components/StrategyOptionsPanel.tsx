"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, LucideIcon, Quote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StrategyOptionCard } from "./StrategyOptionCard";
import { AdFormatsPreview } from "./AdFormatsPreview";

interface StrategyOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
}

interface StrategyData {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  adFormats: string[];
  targetingTips: string[];
}

import { CampaignTypeId } from "@/components/CampaignTypeSelector";
import { CatalogStats, Product } from "@/types/shopify";
import { Package, Tag, Grid3X3, Store, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyOptionsPanelProps {
  brandName: string;
  options: StrategyOption[];
  showOptions: boolean;
  onToggleOption: (id: string) => void;
  onApprove: () => void;
  strategyData?: StrategyData | null;
  isApproving?: boolean;
  campaignType?: CampaignTypeId | null;
  products?: Product[];
  catalogStats?: CatalogStats | null;
}

export function StrategyOptionsPanel({
  brandName,
  options,
  showOptions,
  onToggleOption,
  onApprove,
  strategyData,
  isApproving = false,
  campaignType,
  products = [],
  catalogStats,
}: StrategyOptionsPanelProps) {
  const isDPA = campaignType === "dpa";

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-strategist" />
              <span>Strategy recommendation for {brandName}</span>
            </div>

            {/* Product Catalog Section (Only for DPA) */}
            {isDPA && catalogStats && products.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-card border border-border space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    Product Catalog
                  </h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {products.length} Products
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {catalogStats.categories.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Categories
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {catalogStats.vendors.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Vendors</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {catalogStats.inventoryStatus.inStock}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      In Stock
                    </p>
                  </div>
                </div>

                {/* Product Strip */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Top Products
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {products.slice(0, 4).map((product) => (
                      <div
                        key={product.id}
                        className="aspect-square rounded-md border border-border bg-muted overflow-hidden relative group"
                      >
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0].src}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Store className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                          <p className="text-[10px] text-white truncate w-full">
                            {product.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Strategy Preview Card */}
            {strategyData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-5 rounded-2xl bg-gradient-to-br from-strategist/10 to-strategist/5 border-2 border-strategist/30"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-strategist">
                      Campaign Angle
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {strategyData.campaignAngle}
                  </h3>

                  <div className="pt-2 border-t border-strategist/20 space-y-2">
                    <div className="flex items-start gap-2">
                      <Quote className="w-4 h-4 text-strategist mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {strategyData.headline}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {strategyData.subheadline}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-strategist/20 text-strategist text-sm font-medium">
                      {strategyData.callToAction}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Strategy Options */}
            {options.map((option, index) => (
              <StrategyOptionCard
                key={option.id}
                id={option.id}
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={option.selected}
                onSelect={() => onToggleOption(option.id)}
                delay={0.5 + index * 0.1}
              />
            ))}

            <AdFormatsPreview formats={strategyData?.adFormats} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                onClick={onApprove}
                variant="hero"
                size="xl"
                className="w-full"
                disabled={isApproving}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <span>Starting Creator...</span>
                  </>
                ) : (
                  <>
                    <span>Approve & Start Creating</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
