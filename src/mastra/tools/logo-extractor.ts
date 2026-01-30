import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { extractLogo } from "@/lib/scan/logo-extractor";
import { getSession } from "./browser";

/**
 * Tool to extract a brand logo URL from a webpage.
 * Tries multiple strategies: og:image, favicon, images with "logo" in class/alt.
 */
export const logoExtractorTool = createTool({
  id: "logo-extractor",
  description:
    "Extracts the brand logo URL from a webpage using the active browser session",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID"),
    baseUrl: z.string().url().describe("Base URL for resolving relative paths"),
  }),
  outputSchema: z.object({
    logoUrl: z
      .string()
      .nullable()
      .describe("Extracted logo URL or null if not found"),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        logoUrl: null,
        success: false,
        error: `No active session found for ID: ${context.sessionId}`,
      };
    }
    [
      "#FFFDFB (58.3%)",
      "#FFF4EB (2.6%)",
      "#95C058 (1.4%)",
      "#F1E9E3 (0.2%)",
      "#F08600 (0.1%)",
      "#FAD7A8 (0.1%)",
      "#CCE0AD (0.1%)",
      "#3C2B20 (0.0%)",
      "#87B843 (0.0%)",
      "#9CA86B (0.0%)",
    ];
    try {
      const logoUrl = await extractLogo(session.page, context.baseUrl);
      return { logoUrl, success: true };
    } catch (error) {
      return {
        logoUrl: null,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract logo",
      };
    }
  },
});
