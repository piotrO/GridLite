/**
 * Shared types for Mastra agents, workflows, and API.
 */

/**
 * Aaker's 5 Brand Personality Dimensions (1-5 scale)
 */
export interface PersonalityDimensions {
  sincerity: number;
  excitement: number;
  competence: number;
  sophistication: number;
  ruggedness: number;
}

/**
 * Linguistic mechanics analysis
 */
export interface LinguisticMechanics {
  formality_index: "High" | "Low";
  urgency_level: "High" | "Low";
  etymology_bias: "Latinate" | "Germanic";
}

/**
 * Visual identity extracted from the website
 */
export interface BrandPalette {
  primary: string;
  secondary?: string | null;
  accent?: string | null;
  extraColors?: string[];
}

/**
 * Visual identity extracted from the website
 */
export interface VisualIdentity {
  primary_color: string;
  font_style: string;
}

/**
 * Brand guidelines for copywriters
 */
export interface BrandGuidelines {
  voice_label: string;
  voice_instructions: string;
  dos: string[];
  donts: string[];
}

/**
 * Target audience definition
 */
export interface TargetAudience {
  name: string;
  description: string;
}

/**
 * Jungian Archetype analysis
 */
export interface BrandArchetype {
  primary: string;
  secondary: string;
  brand_motivation: string;
}

/**
 * Complete brand profile from AI analysis
 */
export interface BrandProfile {
  name: string;
  industry: string;
  tagline: string;
  brandSummary: string;
  palette: BrandPalette;
  targetAudiences: TargetAudience[];
  archetype: BrandArchetype;
  personality_dimensions: PersonalityDimensions;
  linguistic_mechanics: LinguisticMechanics;
  guidelines: BrandGuidelines;
  // Optional/extended fields
  shortName?: string;
  url?: string;
  colors?: string[];
  logo?: string;
}

/**
 * Strategy recommendation from Strategist agent
 */
export interface StrategyDocument {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  adFormats: string[];
  targetingTips: string[];
  heroVisualConcept?: string;
}

/**
 * Campaign data extracted from website
 */
export interface CampaignData {
  currentPromos: string[];
  uniqueSellingPoints: string[];
  seasonalContext: string | null;
  callsToAction: string[];
  keyProducts: string[];
}

/**
 * Creative data from Designer agent
 */
export interface CreativeData {
  conceptName: string;
  visualStyle: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    extraColors?: string[];
  };
  typography: {
    headlineStyle: string;
    bodyStyle: string;
  };
  layoutSuggestion: string;
  animationIdeas: string[];
  moodKeywords: string[];
  heroImagePrompt?: string;
  // Optional copy fields for chat updates
  headline?: string;
  bodyCopy?: string;
  ctaText?: string;
}

export interface CreativeDirection {
  greeting: string;
  creative: CreativeData;
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
  updatedStrategy?: StrategyDocument;
  updatedCreative?: CreativeData;
  layerModifications?: LayerModification[];
  imageGenerationRequest?: ImageGenerationRequest;
  needsClarification?: boolean;
  clarificationContext?: string;
}

/**
 * Typography extracted from the website
 */
export interface Typography {
  primaryFontFamily: string;
  fontFileBase64: string | null;
  fontFormat: "woff2" | "woff" | "ttf" | "otf" | null;
  isSystemFont: boolean;
}

/**
 * Full scan result
 */
export interface ScanResult {
  logo: string;
  brand_profile: BrandProfile;
  rawWebsiteText?: string;
  typography?: Typography | null;
}

/**
 * AI analysis result wrapper
 */
export interface AIAnalysisResult {
  brand_profile: BrandProfile;
}
