import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { analyzeWithAI } from "@/app/api/scan/lib/ai-analyzer";

/**
 * Zod schema for target audience.
 */
const TargetAudienceSchema = z.object({
  name: z.string().describe("Short label for the audience (2-4 words)"),
  description: z.string().describe("Brief context (max 10 words)"),
});

/**
 * Zod schema for AI analysis result.
 */
const AIAnalysisResultSchema = z.object({
  colors: z.array(z.string()).describe("3-4 dominant brand hex colors"),
  businessName: z.string().optional().describe("Official full company name"),
  shortName: z.string().optional().describe("Common/short brand name"),
  tagline: z.string().describe("Brand tagline (max 10 words)"),
  voice: z.array(z.string()).describe("3 adjectives describing brand voice"),
  tone: z.string().describe("Description of brand tone (max 50 words)"),
  industry: z.string().optional().describe("Industry/sector"),
  brandSummary: z
    .string()
    .optional()
    .describe("What the company does (1-2 sentences)"),
  targetAudiences: z
    .array(TargetAudienceSchema)
    .optional()
    .describe("Up to 3 target audiences"),
});

/**
 * Tool to analyze a website screenshot with Gemini AI.
 * Extracts comprehensive brand information including colors, voice, tone, and audiences.
 */
export const aiAnalyzerTool = createTool({
  id: "ai-brand-analyzer",
  description:
    "Analyzes a website screenshot with Gemini AI to extract brand information including colors, voice, tone, industry, and target audiences",
  inputSchema: z.object({
    screenshotBase64: z.string().describe("Base64-encoded PNG screenshot"),
  }),
  outputSchema: z.object({
    analysis: AIAnalysisResultSchema.nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const buffer = Buffer.from(context.screenshotBase64, "base64");
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
