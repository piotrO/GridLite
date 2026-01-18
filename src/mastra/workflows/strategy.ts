import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { createBrowserSession, closeBrowser } from "@/app/api/scan/lib/browser";
import { extractWebsiteText } from "@/app/api/scan/lib/text-extractor";
import { parseUrl } from "@/app/api/scan/lib/url-utils";
import {
  extractCampaignData,
  CampaignData,
} from "@/app/api/strategy/lib/strategy-analyzer";
import {
  generateInitialStrategy,
  BrandProfileInput,
  StrategyDocument,
} from "@/app/api/strategy/lib/strategist";

/**
 * Input schema for the strategy workflow.
 */
const StrategyInputSchema = z.object({
  brandProfile: z.object({
    name: z.string(),
    shortName: z.string().optional(),
    url: z.string(),
    industry: z.string().optional(),
    tagline: z.string().optional(),
    brandSummary: z.string().optional(),
    tone: z.string().optional(),
    personality: z.array(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    audiences: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
  }),
  rawWebsiteText: z.string().optional(),
  websiteUrl: z.string().optional(),
});

/**
 * Output schema for campaign data.
 */
const CampaignDataSchema = z.object({
  currentPromos: z.array(z.string()),
  uniqueSellingPoints: z.array(z.string()),
  seasonalContext: z.string().nullable(),
  callsToAction: z.array(z.string()),
  keyProducts: z.array(z.string()),
});

/**
 * Output schema for strategy document.
 */
const StrategyDocumentSchema = z.object({
  recommendation: z.enum(["AWARENESS", "CONVERSION", "ENGAGEMENT"]),
  campaignAngle: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  rationale: z.string(),
  callToAction: z.string(),
  adFormats: z.array(z.string()),
  targetingTips: z.array(z.string()),
});

/**
 * Final output schema for the strategy workflow.
 */
const StrategyOutputSchema = z.object({
  greeting: z.string(),
  strategy: StrategyDocumentSchema,
  campaignData: CampaignDataSchema,
});

/**
 * Step 1: Fetch website text (optional - only if URL provided and no raw text)
 */
const fetchWebsiteTextStep = createStep({
  id: "fetch-website-text",
  inputSchema: StrategyInputSchema,
  outputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    websiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { brandProfile, rawWebsiteText, websiteUrl } = inputData;

    // If we already have raw text, use it
    if (rawWebsiteText) {
      return { brandProfile, websiteText: rawWebsiteText, success: true };
    }

    // If we have a URL, fetch the text
    if (websiteUrl) {
      const normalizedUrl = parseUrl(websiteUrl);
      if (!normalizedUrl) {
        return {
          brandProfile,
          websiteText: `${brandProfile.name}. ${brandProfile.brandSummary || ""} ${brandProfile.tagline || ""}`,
          success: false,
          error: "Invalid website URL",
        };
      }

      try {
        const session = await createBrowserSession(normalizedUrl);
        const websiteText = await extractWebsiteText(session.page);
        await closeBrowser(session.browser);
        return { brandProfile, websiteText, success: true };
      } catch (error) {
        return {
          brandProfile,
          websiteText: `${brandProfile.name}. ${brandProfile.brandSummary || ""} ${brandProfile.tagline || ""}`,
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch website",
        };
      }
    }

    // Fallback: use brand info as text
    return {
      brandProfile,
      websiteText: `${brandProfile.name}. ${brandProfile.brandSummary || ""} ${brandProfile.tagline || ""}`,
      success: true,
    };
  },
});

/**
 * Step 2: Extract campaign data from website text
 */
const extractCampaignDataStep = createStep({
  id: "extract-campaign-data",
  inputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    websiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    campaignData: CampaignDataSchema,
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { brandProfile, websiteText } = inputData;

    try {
      const campaignData = await extractCampaignData(websiteText);
      return { brandProfile, campaignData, success: true };
    } catch (error) {
      // Return default campaign data on failure
      return {
        brandProfile,
        campaignData: {
          currentPromos: [],
          uniqueSellingPoints: ["Quality service", "Professional team"],
          seasonalContext: null,
          callsToAction: ["Contact Us"],
          keyProducts: ["Professional services"],
        },
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract campaign data",
      };
    }
  },
});

/**
 * Step 3: Generate strategy with Strategist persona
 */
const generateStrategyStep = createStep({
  id: "generate-strategy",
  inputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    campaignData: CampaignDataSchema,
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: StrategyOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, campaignData } = inputData;

    try {
      const result = await generateInitialStrategy(
        brandProfile as BrandProfileInput,
        campaignData as CampaignData,
      );

      return {
        greeting: result.greeting,
        strategy: result.strategy as z.infer<typeof StrategyDocumentSchema>,
        campaignData,
      };
    } catch (error) {
      // Return fallback strategy
      return {
        greeting:
          "Hey! I've been diving into your brand and I'm really excited about what I see! 🎯 Let me share my strategic recommendation.",
        strategy: {
          recommendation: "AWARENESS" as const,
          campaignAngle: "Quality & Trust",
          headline: "Your Success Starts Here",
          subheadline: "Professional solutions you can count on",
          rationale:
            "Building brand awareness is key for establishing market presence. A trust-focused campaign resonates with audiences seeking reliability.",
          callToAction: "Learn More",
          adFormats: ["300x250", "728x90", "160x600"],
          targetingTips: [
            "Target users interested in your industry",
            "Use lookalike audiences from your customer base",
          ],
        },
        campaignData,
      };
    }
  },
});

/**
 * Strategy Workflow
 *
 * A deterministic workflow that generates a campaign strategy:
 * 1. Fetch website text (if needed)
 * 2. Extract campaign data
 * 3. Generate strategy with AI
 */
export const strategyWorkflow = createWorkflow({
  id: "strategy",
  inputSchema: StrategyInputSchema,
  outputSchema: StrategyOutputSchema,
})
  .then(fetchWebsiteTextStep)
  .then(extractCampaignDataStep)
  .then(generateStrategyStep)
  .commit();
