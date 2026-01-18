import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  generateInitialCreative,
  BrandProfile,
  StrategyData,
  CampaignData,
} from "@/app/api/designer/lib/designer";

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
    imageDirection: z.string(),
  }),
});

/**
 * Step 1: Generate creative direction with Designer persona
 */
const generateCreativeStep = createStep({
  id: "generate-creative",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, strategy, campaignData } = inputData;

    try {
      const result = await generateInitialCreative(
        brandProfile as BrandProfile,
        strategy as StrategyData,
        (campaignData as CampaignData) || null,
      );

      return {
        greeting: result.greeting,
        creative: result.creative,
      };
    } catch (error) {
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
 * 1. Generate creative with Designer persona (Davinci)
 */
export const designerWorkflow = createWorkflow({
  id: "designer",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema,
})
  .then(generateCreativeStep)
  .commit();
