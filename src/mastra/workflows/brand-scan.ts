import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  createBrowserSession,
  closeBrowser,
  captureScreenshot,
  BrowserSession,
} from "@/lib/scan/browser";
import { extractLogo } from "@/lib/scan/logo-extractor";
import { extractWebsiteText } from "@/lib/scan/text-extractor";
import { analyzeWithAI } from "@/lib/scan/ai-analyzer";
import {
  extractColorsFromScreenshot,
  extractColorsFromLogo,
  extractColorsFromHtml,
} from "@/lib/scan/color-extractor";
import { extractBrandFonts } from "@/lib/scan/font-extractor";
import { BrandPalette } from "@/lib/shared/types";
import { mastra } from "../index";

/**
 * Zod schema for personality dimensions (Aaker's 5 dimensions).
 */
const PersonalityDimensionsSchema = z.object({
  sincerity: z.number().min(1).max(5),
  excitement: z.number().min(1).max(5),
  competence: z.number().min(1).max(5),
  sophistication: z.number().min(1).max(5),
  ruggedness: z.number().min(1).max(5),
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
  primary_color: z.string(),
  font_style: z.string(),
});

/**
 * Zod schema for font detail.
 */
const FontDetailSchema = z.object({
  fontFamily: z.string(),
  fontFileBase64: z.string().nullable(),
  fontFormat: z.enum(["woff2", "woff", "ttf", "otf"]).nullable(),
  isSystemFont: z.boolean(),
});

/**
 * Zod schema for typography.
 */
const TypographySchema = z.object({
  headerFont: FontDetailSchema,
  bodyFont: FontDetailSchema,
});

/**
 * Zod schema for brand palette.
 */
const BrandPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  extraColors: z.array(z.string()).optional(),
});

/**
 * Zod schema for brand guidelines.
 */
const BrandGuidelinesSchema = z.object({
  voice_label: z.string(),
  voice_instructions: z.string(),
  dos: z.array(z.string()),
  donts: z.array(z.string()),
});

/**
 * Zod schema for target audience.
 */
const TargetAudienceSchema = z.object({
  name: z.string(),
  description: z.string(),
});

/**
 * Zod schema for complete brand profile.
 */
const BrandProfileSchema = z.object({
  name: z.string(),
  industry: z.string(),
  brandSummary: z.string(),
  targetAudiences: z.array(TargetAudienceSchema),
  archetype: z.object({
    primary: z.string(),
    secondary: z.string(),
    brand_motivation: z.string(),
  }),
  personality_dimensions: PersonalityDimensionsSchema,
  linguistic_mechanics: LinguisticMechanicsSchema,
  guidelines: BrandGuidelinesSchema,
  palette: BrandPaletteSchema.optional(),
});

/**
 * Zod schema for the workflow input.
 */
const ScanInputSchema = z.object({
  url: z.string().url().describe("The URL to scan"),
});

/**
 * Zod schema for the workflow output (matches ScanResult).
 */
const ScanOutputSchema = z.object({
  logo: z.string(),
  brand_profile: BrandProfileSchema,
  rawWebsiteText: z.string().optional(),
  typography: TypographySchema.optional(),
});

// We need to store the browser session across steps
// Since workflows don't have built-in state sharing for complex objects,
// we use a Map keyed by run ID
const sessionStore = new Map<string, BrowserSession>();

/**
 * Step 1: Launch browser and navigate to URL
 */
const launchBrowserStep = createStep({
  id: "launch-browser",
  inputSchema: ScanInputSchema,
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, runId }) => {
    const { url } = inputData;
    const sessionKey = `session_${runId}`;

    try {
      const session = await createBrowserSession(url);
      sessionStore.set(sessionKey, session);
      return { url, sessionKey, success: true };
    } catch (error) {
      return {
        url,
        sessionKey,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to launch browser",
      };
    }
  },
});

/**
 * Step 1.5: Extract Brand Fonts
 */
const extractFontsStep = createStep({
  id: "extract-fonts",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    typography: TypographySchema.nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, success, error } = inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        typography: null,
        success: false,
        error,
      };
    }

    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        typography: null,
        success: false,
        error: "No session found",
      };
    }

    try {
      const result = await extractBrandFonts(session.page);
      return {
        url,
        sessionKey,
        typography: result,
        success: true,
      };
    } catch (error) {
      console.warn("Font extraction failed:", error);
      // Don't fail the whole workflow, just return null typography
      return {
        url,
        sessionKey,
        typography: null,
        success: true, // Continue workflow
        error:
          error instanceof Error ? error.message : "Failed to extract fonts",
      };
    }
  },
});

/**
 * Step 2: Extract the brand logo
 */
const extractLogoStep = createStep({
  id: "extract-logo",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    typography: TypographySchema.nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    typography: TypographySchema.nullable(),
    logoUrl: z.string().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, typography, success, error } = inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        typography,
        logoUrl: null,
        success: false,
        error,
      };
    }

    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        typography,
        logoUrl: null,
        success: false,
        error: "No session found",
      };
    }

    try {
      const logoUrl = await extractLogo(session.page, url);
      return {
        url,
        sessionKey,
        typography,
        logoUrl,
        success: true,
      };
    } catch (error) {
      return {
        url,
        sessionKey,
        typography,
        logoUrl: null,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract logo",
      };
    }
  },
});

/**
 * Step 3: Capture screenshot
 */
const captureScreenshotStep = createStep({
  id: "capture-screenshot",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, logoUrl, typography, success, error } = inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: "",
        success: false,
        error,
      };
    }

    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: "",
        success: false,
        error: "No session found",
      };
    }

    try {
      const buffer = await captureScreenshot(session.page);
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: buffer.toString("base64"),
        success: true,
      };
    } catch (error) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: "",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to capture screenshot",
      };
    }
  },
});

/**
 * Step 3b: Extract Text (moved up to get HTML for color analysis)
 */
const extractTextStep = createStep({
  id: "extract-text",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    rawHtml: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const {
      url,
      sessionKey,
      logoUrl,
      typography,
      screenshotBase64,
      success,
      error,
    } = inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64,
        rawWebsiteText: "",
        rawHtml: "",
        success: false,
        error,
      };
    }

    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        rawWebsiteText: "",
        rawHtml: "",
        success: false,
        error: "No session found",
      };
    }

    try {
      const start = Date.now();
      const rawWebsiteText = await extractWebsiteText(session.page);
      const rawHtml = await session.page.content(); // Get raw HTML for color analysis
      console.log(`[Text&HTML] Extracted in ${Date.now() - start}ms`);

      // Close the browser now that we're done with it using cleanup function
      await session.cleanup();
      sessionStore.delete(sessionKey);

      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64,
        rawWebsiteText,
        rawHtml,
        success: true,
      };
    } catch (error) {
      // Still try to close the browser
      const session = sessionStore.get(sessionKey);
      if (session) {
        await session.cleanup();
        sessionStore.delete(sessionKey);
      }

      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        rawWebsiteText: "",
        rawHtml: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract text",
      };
    }
  },
});

/**
 * Step 4: Extract Colors from all sources
 */
const extractColorsStep = createStep({
  id: "extract-colors-multi",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    rawHtml: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    screenshotColors: BrandPaletteSchema,
    logoColors: BrandPaletteSchema,
    htmlColors: z.array(z.string()),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { screenshotBase64, logoUrl, typography, rawHtml, success } =
      inputData;

    // Defaults
    let screenshotColors: BrandPalette = {
      primary: "#000",
      secondary: "#000",
      accent: "#000",
    };
    let logoColors: BrandPalette = {
      primary: "#000",
      secondary: null,
      accent: null,
    };
    let htmlColors: string[] = [];

    if (!success) {
      return {
        ...inputData,
        typography,
        screenshotColors,
        logoColors,
        htmlColors,
      };
    }

    try {
      // 1. Screenshot Colors
      if (screenshotBase64) {
        const buffer = Buffer.from(screenshotBase64, "base64");
        screenshotColors = await extractColorsFromScreenshot(buffer);
      }

      // 2. Logo Colors
      if (logoUrl) {
        logoColors = await extractColorsFromLogo(logoUrl);
      }

      // 3. HTML Colors
      if (rawHtml) {
        htmlColors = extractColorsFromHtml(rawHtml);
      }

      return {
        ...inputData,
        screenshotColors,
        logoColors,

        htmlColors,
        typography,
      };
    } catch (e) {
      console.error("Error in color extraction step:", e);
      return {
        ...inputData,
        typography,
        screenshotColors,
        logoColors,
        htmlColors,
      };
    }
  },
});

/**
 * Step 5: Reason about Brand Colors using Mastra Agent
 */
const determineBrandColorsStep = createStep({
  id: "determine-brand-colors",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    screenshotColors: BrandPaletteSchema,
    logoColors: BrandPaletteSchema,
    htmlColors: z.array(z.string()),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    palette: BrandPaletteSchema,
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { screenshotColors, logoColors, htmlColors, success } = inputData;

    if (!success) {
      return {
        ...inputData,
        palette: { primary: "#000", secondary: "#000", accent: "#000" },
      };
    }

    try {
      const agent = mastra.getAgent("colorReasoner");
      const result = await agent.generate(
        JSON.stringify({
          screenshotColors,
          logoColors,
          htmlColors: htmlColors.slice(0, 50), // Limit noise
        }),
      );

      // Parse result text (expecting JSON)
      let palette = { primary: "#000", secondary: "#000", accent: "#000" };
      try {
        const jsonStr = result.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        palette = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse color reasoner output:", result.text);
        // Fallback to screenshot colors
        palette = screenshotColors;
      }

      return {
        ...inputData,
        palette,
      };
    } catch (error) {
      console.error("Color reasoning failed:", error);
      return {
        ...inputData,
        palette: screenshotColors, // Fallback
      };
    }
  },
});

/**
 * Default brand profile for fallback scenarios
 */
const DEFAULT_BRAND_PROFILE = {
  name: "Premium Tech Company",
  industry: "Technology & Software",
  brandSummary:
    "A leading provider of innovative hardware and software solutions.",
  targetAudiences: [
    { name: "Creative Professionals", description: "Seeking high-end tools." },
  ],
  archetype: {
    primary: "The Creator",
    secondary: "The Sage",
    brand_motivation: "Enabling creativity through technical excellence.",
  },
  personality_dimensions: {
    sincerity: 3,
    excitement: 4,
    competence: 4,
    sophistication: 3,
    ruggedness: 2,
  },
  linguistic_mechanics: {
    formality_index: "Low" as const,
    urgency_level: "Low" as const,
    etymology_bias: "Germanic" as const,
  },
  guidelines: {
    voice_label: "Modern Professional",
    voice_instructions: "Write with confident clarity.",
    dos: ["Use active voice", "Be direct"],
    donts: ["Avoid jargon", "No passive voice"],
  },
};

/**
 * Step 6: AI Analysis (updated input schema)
 */
const analyzeWithAIStep = createStep({
  id: "analyze-with-ai",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable().optional(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    palette: BrandPaletteSchema,
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: ScanOutputSchema,
  execute: async ({ inputData }) => {
    const {
      logoUrl,
      typography,
      screenshotBase64,
      palette,
      rawWebsiteText,
      success,
      error,
    } = inputData;

    // Default fallback result
    const defaultResult = {
      logo: logoUrl || "🚀",
      brand_profile: {
        ...DEFAULT_BRAND_PROFILE,
        palette,
      },
      rawWebsiteText,
      typography,
    };

    if (!success || !screenshotBase64) {
      const errorMsg = error || "Failed to scan website";
      return {
        ...defaultResult,
        brand_profile: {
          ...DEFAULT_BRAND_PROFILE,
          brandSummary: `SCAN FAILED: ${errorMsg}`,
          guidelines: {
            ...DEFAULT_BRAND_PROFILE.guidelines,
            voice_instructions: errorMsg,
          },
        },
      };
    }

    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const aiResult = await analyzeWithAI(buffer);

      return {
        logo: logoUrl || "🚀",
        brand_profile: {
          ...aiResult.brand_profile,
          // OVERRIDE the AI's guessed palette with our reasoned palette
          palette,
        },
        rawWebsiteText,
        typography,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "AI analysis failed";
      console.error("AI Analysis execution failed:", error);

      return {
        ...defaultResult,
        brand_profile: {
          ...DEFAULT_BRAND_PROFILE,
          brandSummary: `AI ANALYSIS FAILED: ${errorMsg}`,
          guidelines: {
            ...DEFAULT_BRAND_PROFILE.guidelines,
            voice_instructions: `AI analysis failed: ${errorMsg}`,
          },
        },
      };
    }
  },
});

/**
 * Brand Scan Workflow
 *
 * A deterministic workflow that scans a website and extracts brand information:
 * 1. Launch browser and navigate to URL
 * 2. Extract brand logo
 * 3. Capture screenshot
 * 4. Extract text content
 * 5. Analyze with Gemini AI using Brand Scout methodology
 */
export const brandScanWorkflow = createWorkflow({
  id: "brand-scan",
  inputSchema: ScanInputSchema,
  outputSchema: ScanOutputSchema,
})
  .then(launchBrowserStep)
  .then(extractFontsStep)
  .then(extractLogoStep)
  .then(captureScreenshotStep)
  .then(extractTextStep) // Changed order: text/HTML extraction happens before color analysis
  .then(extractColorsStep)
  .then(determineBrandColorsStep)
  .then(analyzeWithAIStep)
  .commit();

/**
 * Helper to clean up any orphaned sessions (e.g., if workflow fails mid-execution)
 */
export async function cleanupSession(sessionKey: string): Promise<void> {
  const session = sessionStore.get(sessionKey);
  if (session) {
    await session.cleanup();
    sessionStore.delete(sessionKey);
  }
}
