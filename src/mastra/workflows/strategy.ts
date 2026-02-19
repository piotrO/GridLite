import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { mastra } from "@/mastra";
import { createBrowserSession, closeBrowser } from "@/lib/scan/browser";
import { extractWebsiteText } from "@/lib/scan/text-extractor";
import { parseUrl } from "@/lib/shared/url-utils";
import {
  extractCampaignData,
  CampaignData,
} from "@/lib/strategy/strategy-analyzer";
import { BrandProfile, StrategyDocument } from "@/lib/shared/types";

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
    palette: z
      .object({
        primary: z.string(),
        secondary: z.string(),
        accent: z.string(),
        extraColors: z.array(z.string()).optional(),
      })
      .optional(),
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

    // If we have raw text, validate it
    if (rawWebsiteText && rawWebsiteText.length > 200) {
      return { brandProfile, websiteText: rawWebsiteText, success: true };
    }

    // Default fallback text construction
    const fallbackText = `Brand Name: ${brandProfile.name}. 
Industry: ${brandProfile.industry || "Unknown"}. 
Summary: ${brandProfile.brandSummary || "N/A"}. 
Tagline: ${brandProfile.tagline || "N/A"}. 
Key Audiences: ${brandProfile.audiences?.map((a) => a.name).join(", ") || "General"}.`;

    // If we have a URL, try to fetch the text (either because no raw text or it was too short)
    if (websiteUrl) {
      const normalizedUrl = parseUrl(websiteUrl);

      // If URL is invalid, just proceed with fallback
      if (!normalizedUrl) {
        return {
          brandProfile,
          websiteText: rawWebsiteText || fallbackText,
          success: true, // Treat as success to keep workflow moving
          error: "Invalid website URL - used brand profile instead",
        };
      }

      try {
        console.log(
          "Strategy workflow: scraping website for better content...",
        );
        // Attempt scraping with a timeout
        const session = await Promise.race([
          createBrowserSession(normalizedUrl),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Browser session timeout")),
              25000,
            ),
          ),
        ]);

        const websiteText = await extractWebsiteText(session.page);
        await closeBrowser(session.browser);

        // If extracted text is too short, use fallback
        if (!websiteText || websiteText.length < 50) {
          return {
            brandProfile,
            websiteText: rawWebsiteText || fallbackText,
            success: true,
            error: "Extracted text too short - used brand profile instead",
          };
        }

        return { brandProfile, websiteText, success: true };
      } catch (error) {
        // Gracefully fail back to brand profile data
        console.error(
          "Strategy workflow scraping failed, using fallback:",
          error,
        );
        return {
          brandProfile,
          websiteText: fallbackText,
          success: true, // CRITICAL: Return true so the workflow continues
          error:
            error instanceof Error ? error.message : "Failed to fetch website",
        };
      }
    }

    // Fallback: use brand info as text (when no URL provided)
    return {
      brandProfile,
      websiteText: fallbackText,
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
      const agent = mastra.getAgent("strategist");

      const contextPrompt = `
BRAND PROFILE:
Name: ${brandProfile.name}
Industry: ${brandProfile.industry || "Unknown"}
Summary: ${brandProfile.brandSummary || "N/A"}
Tagline: ${brandProfile.tagline || "N/A"}
Audiences: ${brandProfile.audiences?.map((a) => a.name).join(", ") || "General"}

CAMPAIGN DATA (Extracted from Website):
Promotions: ${campaignData?.currentPromos.join(", ") || "None"}
USPs: ${campaignData?.uniqueSellingPoints.join(", ") || "N/A"}
Key Products: ${campaignData?.keyProducts.join(", ") || "N/A"}
Calls to Action: ${campaignData?.callsToAction.join(", ") || "N/A"}
`;

      const result = await agent.generate([
        { role: "user", content: contextPrompt },
        {
          role: "user",
          content: "Generate the initial strategy in JSON format.",
        },
      ]);

      let parsed;
      try {
        const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : result.text.trim();
        parsed = JSON.parse(jsonString);
      } catch (e) {
        throw new Error("Failed to parse agent response as JSON");
      }

      return {
        greeting:
          parsed.greeting || "Hey! I've put together a strategy for you.",
        strategy: parsed.strategy as z.infer<typeof StrategyDocumentSchema>,
        campaignData: campaignData as CampaignData,
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
