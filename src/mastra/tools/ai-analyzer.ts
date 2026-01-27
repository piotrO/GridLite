import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { analyzeWithAI } from "@/lib/scan/ai-analyzer";

/**
 * Zod schema for personality dimensions (Aaker's 5 dimensions).
 */
const PersonalityDimensionsSchema = z.object({
  sincerity: z.number().min(1).max(5).describe("1-5 scale"),
  excitement: z.number().min(1).max(5).describe("1-5 scale"),
  competence: z.number().min(1).max(5).describe("1-5 scale"),
  sophistication: z.number().min(1).max(5).describe("1-5 scale"),
  ruggedness: z.number().min(1).max(5).describe("1-5 scale"),
});

/**
 * Zod schema for linguistic mechanics.
 */
const LinguisticMechanicsSchema = z.object({
  formality_index: z.enum(["High", "Low"]),
  urgency_level: z.enum(["High", "Low"]),
  etymology_bias: z.enum(["Latinate", "Germanic"]),
});

/**
 * Zod schema for visual identity.
 */
const VisualIdentitySchema = z.object({
  primary_color: z.string().describe("Hex color code"),
  font_style: z.string().describe("Serif, Sans-Serif, Slab, Script"),
});

/**
 * Zod schema for brand guidelines.
 */
const BrandGuidelinesSchema = z.object({
  voice_label: z.string().describe("A short label for the brand's voice"),
  voice_instructions: z.string().describe("Actionable advice for copywriters"),
  dos: z.array(z.string()).describe("4-5 specific copywriting instructions"),
  donts: z.array(z.string()).describe("4-5 specific avoidances"),
});

/**
 * Zod schema for target audience.
 */
const TargetAudienceSchema = z.object({
  name: z.string().describe("Short label for the audience (1-3 words)"),
  description: z.string().describe("Brief context (max 10 words)"),
});

/**
 * Zod schema for complete brand profile.
 */
const BrandProfileSchema = z.object({
  name: z.string().describe("Brand name"),
  industry: z.string().describe("Industry/sector"),
  brandSummary: z.string().describe("What the company does"),
  targetAudiences: z
    .array(TargetAudienceSchema)
    .describe("Up to 3 target audiences"),
  archetype: z.object({
    primary: z.string().describe("Primary Jungian Archetype"),
    secondary: z.string().describe("Secondary Jungian Archetype"),
    brand_motivation: z
      .string()
      .describe("Motivation behind the chosen archetypes"),
  }),
  personality_dimensions: PersonalityDimensionsSchema,
  linguistic_mechanics: LinguisticMechanicsSchema,
  guidelines: BrandGuidelinesSchema,
});

/**
 * Zod schema for AI analysis result.
 */
const AIAnalysisResultSchema = z.object({
  brand_profile: BrandProfileSchema,
});

/**
 * Tool to analyze a website screenshot with Gemini AI.
 * Uses the Brand Scout methodology to extract comprehensive brand voice guidelines.
 */
export const aiAnalyzerTool = createTool({
  id: "ai-brand-analyzer",
  description:
    "Analyzes a website screenshot with Gemini AI using the Brand Scout methodology. Extracts Aaker's personality dimensions, linguistic mechanics, and brand guidelines including voice instructions and visual identity.",
  inputSchema: z.object({
    screenshotBase64: z.string().describe("Base64-encoded PNG screenshot"),
  }),
  outputSchema: z.object({
    analysis: AIAnalysisResultSchema.nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ screenshotBase64 }) => {
    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const analysis = await analyzeWithAI(buffer);
      return { analysis, success: true };
    } catch (error) {
      return {
        analysis: null,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to analyze with AI",
      };
    }
  },
});
