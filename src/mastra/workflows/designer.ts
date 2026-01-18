import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { mastra } from "@/mastra";
import type { BrandProfile, StrategyData, CampaignData } from "@/types/designer";

/**
 * Brand profile schema for designer input.
 */
const BrandProfileSchema = z.object({
  name: z.string(),
  shortName: z.string().optional(),
  url: z.string().optional(),
  industry: z.string().optional(),
  tagline: z.string().optional(),
  brandSummary: z.string().optional(),
  tone: z.string().optional(),
  personality: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  logo: z.string().optional(),
  audiences: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
});

/**
 * Strategy data schema.
 */
const StrategyDataSchema = z.object({
  recommendation: z.enum(["AWARENESS", "CONVERSION", "ENGAGEMENT"]),
  campaignAngle: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  rationale: z.string(),
  callToAction: z.string(),
  heroVisualConcept: z.string().optional(),
  adFormats: z.array(z.string()),
  targetingTips: z.array(z.string()),
});

/**
 * Campaign data schema (optional input).
 */
const CampaignDataSchema = z
  .object({
    currentPromos: z.array(z.string()),
    uniqueSellingPoints: z.array(z.string()),
    seasonalContext: z.string().nullable(),
    callsToAction: z.array(z.string()),
    keyProducts: z.array(z.string()),
  })
  .nullable();

/**
 * Input schema for the designer workflow.
 */
const DesignerInputSchema = z.object({
  brandProfile: BrandProfileSchema,
  strategy: StrategyDataSchema,
  campaignData: CampaignDataSchema.optional(),
});

/**
 * Creative direction output schema.
 */
const CreativeOutputSchema = z.object({
  greeting: z.string(),
  creative: z.object({
    conceptName: z.string(),
    visualStyle: z.string(),
    colorScheme: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
    }),
    typography: z.object({
      headlineStyle: z.string(),
      bodyStyle: z.string(),
    }),
    layoutSuggestion: z.string(),
    animationIdeas: z.array(z.string()),
    moodKeywords: z.array(z.string()),
    heroImagePrompt: z.string().optional(),
    imageDirection: z.string().optional(),
  }),
});

/**
 * Build context prompt for the designer agent.
 */
function buildContextPrompt(
  brand: BrandProfile,
  strategy: StrategyData,
  campaign: CampaignData | null
): string {
  return `
## Brand Information
- Name: ${brand.name}
- Industry: ${brand.industry || "Not specified"}
- Tagline: ${brand.tagline || "None provided"}
- About: ${brand.brandSummary || "No description available"}
- Brand Voice: ${brand.tone || "Professional"}
- Brand Colors: ${brand.colors?.join(", ") || "Not specified"}
- Personality: ${brand.personality?.join(", ") || "Not specified"}

## Target Audiences
${brand.audiences && brand.audiences.length > 0
    ? brand.audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n")
    : "- General consumers"
  }

## Approved Campaign Strategy
- Type: ${strategy.recommendation}
- Campaign Angle: "${strategy.campaignAngle}"
- Headline: "${strategy.headline}"
- Subheadline: "${strategy.subheadline}"
- CTA: "${strategy.callToAction}"
- Hero Visual Concept: "${strategy.heroVisualConcept || "Not specified"}"
- Ad Formats: ${strategy.adFormats.join(", ")}

## Campaign Data
${campaign
    ? `
- Current Promotions: ${campaign.currentPromos.join(", ") || "None"}
- Key Products: ${campaign.keyProducts.join(", ")}
- USPs: ${campaign.uniqueSellingPoints.join(", ")}
`
    : "No additional campaign data available."
  }

Based on this information, create a cohesive visual direction that brings this campaign to life.
`;
}

/**
 * Parse designer response from the agent.
 */
function parseDesignerResponse(responseText: string, brand: BrandProfile) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonString);
  } catch {
    // Fallback response using brand colors if available
    const primaryColor = brand.colors?.[0] || "#4F46E5";
    const secondaryColor = brand.colors?.[1] || "#F97316";

    return {
      greeting: `Hey! 🎨 I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
      creative: {
        conceptName: "Bold Impact",
        visualStyle: "Modern and Dynamic",
        colorScheme: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: "#10B981",
          background: "#FFFFFF",
        },
        typography: {
          headlineStyle: "Bold Sans-Serif",
          bodyStyle: "Clean Sans-Serif",
        },
        layoutSuggestion:
          "Hero headline at top with strong visual center and CTA button prominently placed at bottom.",
        animationIdeas: [
          "Fade-in headline with subtle slide",
          "Pulsing CTA button to draw attention",
        ],
        moodKeywords: ["Professional", "Trustworthy", "Modern"],
        heroImagePrompt:
          "Professional hero image for digital advertising, clean composition, modern style",
        imageDirection:
          "Clean product shots or abstract brand imagery with strong contrast.",
      },
    };
  }
}

/**
 * Step 1: Generate creative direction with Designer agent
 */
const generateCreativeStep = createStep({
  id: "generate-creative",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, strategy, campaignData } = inputData;

    try {
      const agent = mastra.getAgent("designer");
      const contextPrompt = buildContextPrompt(
        brandProfile as BrandProfile,
        strategy as StrategyData,
        (campaignData as CampaignData) || null,
      );

      const result = await agent.generate([
        { role: "user", content: contextPrompt },
      ]);

      const parsed = parseDesignerResponse(result.text, brandProfile as BrandProfile);

      return {
        greeting: parsed.greeting,
        creative: parsed.creative,
      };
    } catch (error) {
      console.error("[Designer Workflow] Error:", error);
      // Return fallback creative direction
      const primaryColor = brandProfile.colors?.[0] || "#4F46E5";
      const secondaryColor = brandProfile.colors?.[1] || "#F97316";

      return {
        greeting: `Hey! 🎨 I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
        creative: {
          conceptName: "Bold Impact",
          visualStyle: "Modern and Dynamic",
          colorScheme: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: "#10B981",
            background: "#FFFFFF",
          },
          typography: {
            headlineStyle: "Bold Sans-Serif",
            bodyStyle: "Clean Sans-Serif",
          },
          layoutSuggestion:
            "Hero headline at top with strong visual center and CTA button prominently placed at bottom.",
          animationIdeas: [
            "Fade-in headline with subtle slide",
            "Pulsing CTA button to draw attention",
          ],
          moodKeywords: ["Professional", "Trustworthy", "Modern"],
          heroImagePrompt:
            "Professional hero image for digital advertising, clean composition, modern style",
          imageDirection:
            "Clean product shots or abstract brand imagery with strong contrast.",
        },
      };
    }
  },
});

/**
 * Designer Workflow
 *
 * A single-step workflow that generates creative direction:
 * 1. Generate creative with Designer agent (Davinci)
 */
export const designerWorkflow = createWorkflow({
  id: "designer",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema,
})
  .then(generateCreativeStep)
  .commit();
