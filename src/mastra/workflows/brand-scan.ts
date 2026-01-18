import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  createBrowserSession,
  closeBrowser,
  captureScreenshot,
  BrowserSession,
} from "@/app/api/scan/lib/browser";
import { extractLogo } from "@/app/api/scan/lib/logo-extractor";
import { extractWebsiteText } from "@/app/api/scan/lib/text-extractor";
import { analyzeWithAI } from "@/app/api/scan/lib/ai-analyzer";

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
  colors: z.array(z.string()),
  businessName: z.string().optional(),
  shortName: z.string().optional(),
  tagline: z.string(),
  voice: z.array(z.string()),
  tone: z.string(),
  industry: z.string().optional(),
  brandSummary: z.string().optional(),
  targetAudiences: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
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
 * Step 4: Extract text content
 */
const extractTextStep = createStep({
  id: "extract-text",
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
    rawWebsiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, logoUrl, screenshotBase64, success, error } =
      inputData;

    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
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
        rawWebsiteText: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract text",
      };
    }
  },
});

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
    rawWebsiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  outputSchema: ScanOutputSchema,
  execute: async ({ inputData }) => {
    const { logoUrl, screenshotBase64, rawWebsiteText, success, error } =
      inputData;

    // Default fallback result
    const defaultResult = {
      logo: logoUrl || "🚀",
      colors: ["#4F46E5", "#F97316", "#10B981", "#8B5CF6"],
      businessName: undefined,
      shortName: undefined,
      tagline: "Innovation meets excellence",
      voice: ["Innovative", "Trustworthy", "Modern"],
      tone: "Professional yet approachable",
      industry: undefined,
      brandSummary: undefined,
      targetAudiences: undefined,
      rawWebsiteText,
    };

    if (!success || !screenshotBase64) {
      return {
        ...defaultResult,
        brandSummary: error || "Failed to scan website",
      };
    }

    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const aiResult = await analyzeWithAI(buffer);

      return {
        logo: logoUrl || "🚀",
        colors: aiResult.colors?.length
          ? aiResult.colors.slice(0, 4)
          : defaultResult.colors,
        businessName: aiResult.businessName,
        shortName: aiResult.shortName,
        tagline: aiResult.tagline || defaultResult.tagline,
        voice: aiResult.voice?.length ? aiResult.voice : defaultResult.voice,
        tone: aiResult.tone || defaultResult.tone,
        industry: aiResult.industry,
        brandSummary: aiResult.brandSummary,
        targetAudiences: aiResult.targetAudiences,
        rawWebsiteText,
      };
    } catch (error) {
      return {
        ...defaultResult,
        brandSummary:
          error instanceof Error
            ? `AI analysis failed: ${error.message}`
            : "AI analysis failed",
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
 * 5. Analyze with Gemini AI
 */
export const brandScanWorkflow = createWorkflow({
  id: "brand-scan",
  inputSchema: ScanInputSchema,
  outputSchema: ScanOutputSchema,
})
  .then(launchBrowserStep)
  .then(extractLogoStep)
  .then(captureScreenshotStep)
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
