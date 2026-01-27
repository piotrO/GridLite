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
import { extractBrandColors } from "@/lib/scan/color-extractor";
import { BrandPalette } from "@/lib/shared/types";

/**
 * Zod schema for the workflow input.
 */
const ScanInputSchema = z.object({
  url: z.string().url().describe("The URL to scan"),
});

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
 * Zod schema for brand palette.
 */
const BrandPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
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
 * Zod schema for the workflow output (matches ScanResult).
 */
const ScanOutputSchema = z.object({
  logo: z.string(),
  brand_profile: BrandProfileSchema,
  rawWebsiteText: z.string().optional(),
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
 * Step 2: Extract the brand logo
 */
const extractLogoStep = createStep({
  id: "extract-logo",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, success, error } = inputData;

    if (!success) {
      return { url, sessionKey, logoUrl: null, success: false, error };
    }

    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        logoUrl: null,
        success: false,
        error: "No session found",
      };
    }

    try {
      const logoUrl = await extractLogo(session.page, url);
      return { url, sessionKey, logoUrl, success: true };
    } catch (error) {
      return {
        url,
        sessionKey,
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
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, logoUrl, success, error } = inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
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
        screenshotBase64: buffer.toString("base64"),
        success: true,
      };
    } catch (error) {
      return {
        url,
        sessionKey,
        logoUrl,
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
 * Step 4: Extract brand colors from screenshot
 */
const analyzeColorsStep = createStep({
  id: "analyze-colors",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    palette: BrandPaletteSchema,
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { screenshotBase64, success } = inputData;

    if (!success || !screenshotBase64) {
      return {
        ...inputData,
        palette: {
          primary: "#4F46E5",
          secondary: "#4F46E5",
          accent: "#4F46E5",
        },
      };
    }

    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const palette = await extractBrandColors(buffer);
      return {
        ...inputData,
        palette,
      };
    } catch (error) {
      return {
        ...inputData,
        palette: {
          primary: "#4F46E5",
          secondary: "#4F46E5",
          accent: "#4F46E5",
        },
      };
    }
  },
});

/**
 * Step 4: Extract text content
 */
const extractTextStep = createStep({
  id: "extract-text",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    palette: BrandPaletteSchema,
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    palette: BrandPaletteSchema,
    rawWebsiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const {
      url,
      sessionKey,
      logoUrl,
      screenshotBase64,
      palette,
      success,
      error,
    } = inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        palette,
        rawWebsiteText: "",
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
        palette,
        rawWebsiteText: "",
        success: false,
        error: "No session found",
      };
    }

    try {
      const rawWebsiteText = await extractWebsiteText(session.page);

      // Close the browser now that we're done with it
      await closeBrowser(session.browser);
      sessionStore.delete(sessionKey);

      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        palette,
        rawWebsiteText,
        success: true,
      };
    } catch (error) {
      // Still try to close the browser
      const session = sessionStore.get(sessionKey);
      if (session) {
        await closeBrowser(session.browser);
        sessionStore.delete(sessionKey);
      }

      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        palette,
        rawWebsiteText: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract text",
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
 * Step 5: Analyze with AI
 */
const analyzeWithAIStep = createStep({
  id: "analyze-with-ai",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    palette: BrandPaletteSchema,
    rawWebsiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: ScanOutputSchema,
  execute: async ({ inputData }) => {
    const {
      logoUrl,
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
    };

    if (!success || !screenshotBase64) {
      return {
        ...defaultResult,
        brand_profile: {
          ...DEFAULT_BRAND_PROFILE,
          guidelines: {
            ...DEFAULT_BRAND_PROFILE.guidelines,
            voice_instructions: error || "Failed to scan website",
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
          palette,
        },
        rawWebsiteText,
      };
    } catch (error) {
      return {
        ...defaultResult,
        brand_profile: {
          ...DEFAULT_BRAND_PROFILE,
          guidelines: {
            ...DEFAULT_BRAND_PROFILE.guidelines,
            voice_instructions:
              error instanceof Error
                ? `AI analysis failed: ${error.message}`
                : "AI analysis failed",
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
  .then(extractLogoStep)
  .then(captureScreenshotStep)
  .then(analyzeColorsStep)
  .then(extractTextStep)
  .then(analyzeWithAIStep)
  .commit();

/**
 * Helper to clean up any orphaned sessions (e.g., if workflow fails mid-execution)
 */
export async function cleanupSession(sessionKey: string): Promise<void> {
  const session = sessionStore.get(sessionKey);
  if (session) {
    await closeBrowser(session.browser);
    sessionStore.delete(sessionKey);
  }
}
