/**
 * Shared types for Designer agent and API.
 */

export interface BrandProfile {
  name: string;
  shortName?: string;
  url: string;
  industry?: string;
  tagline?: string;
  brandSummary?: string;
  tone?: string;
  personality?: string[];
  colors?: string[];
  logo?: string;
  audiences?: { name: string; description: string }[];
}

export interface StrategyData {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  heroVisualConcept?: string;
  adFormats: string[];
  targetingTips: string[];
}

export interface CampaignData {
  currentPromos: string[];
  uniqueSellingPoints: string[];
  seasonalContext: string | null;
  callsToAction: string[];
  keyProducts: string[];
}

export interface CreativeDirection {
  greeting: string;
  creative: CreativeData;
}

export interface CreativeData {
  conceptName: string;
  visualStyle: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    headlineStyle: string;
    bodyStyle: string;
  };
  layoutSuggestion: string;
  animationIdeas: string[];
  moodKeywords: string[];
  heroImagePrompt?: string;
  /** @deprecated use heroImagePrompt instead */
  imageDirection?: string;
  // Optional copy fields for chat updates
  headline?: string;
  bodyCopy?: string;
  ctaText?: string;
}

export interface LayerModification {
  layerName: string;
  positionDelta?: { x?: number; y?: number };
  scaleFactor?: number;
  sizes?: string[];
}

export interface ImageGenerationRequest {
  prompt: string;
  style: "product" | "lifestyle" | "abstract" | "hero";
  regenerate?: boolean;
}

export interface ChatResponse {
  message: string;
  updatedCreative?: CreativeData;
  layerModifications?: LayerModification[];
  imageGenerationRequest?: ImageGenerationRequest;
  needsClarification?: boolean;
  clarificationContext?: string;
}
