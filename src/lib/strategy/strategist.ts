import {
  BrandProfile,
  StrategyDocument,
  CampaignData,
  ChatResponse,
} from "@/lib/shared/types";

export type {
  BrandProfile,
  StrategyDocument,
  CampaignData,
  ChatResponse,
} from "@/lib/shared/types";

/**
 * Strategy recommendation from Strategist agent (legacy wrapper)
 * Most logic is now handled directly by Mastra agents and workflows.
 */
export interface StrategistResponse {
  greeting: string;
  strategy: StrategyDocument;
}

/**
 * These types are kept for backward compatibility if needed,
 * but @/lib/shared/types should be used for new code.
 */
export type BrandProfileInput = BrandProfile;
