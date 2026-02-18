import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { extractBrandFonts } from "@/lib/scan/font-extractor";
import { getSession } from "./browser";

/**
 * Tool to extract brand fonts from a webpage.
 * Intercepts font files network requests and matches them with computed styles.
 */
export const fontExtractorTool = createTool({
  id: "font-extractor",
  description: "Extracts the header and body fonts from a webpage",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID"),
  }),
  outputSchema: z.object({
    headerFont: z.object({
      fontFamily: z.string(),
      fontFileBase64: z.string().nullable(),
      fontFormat: z.enum(["woff2", "woff", "ttf", "otf"]).nullable(),
      isSystemFont: z.boolean(),
    }),
    bodyFont: z.object({
      fontFamily: z.string(),
      fontFileBase64: z.string().nullable(),
      fontFormat: z.enum(["woff2", "woff", "ttf", "otf"]).nullable(),
      isSystemFont: z.boolean(),
    }),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ sessionId }) => {
    const session = getSession(sessionId);
    if (!session) {
      const emptyFont = {
        fontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true,
      };
      return {
        headerFont: emptyFont,
        bodyFont: emptyFont,
        success: false,
        error: `No active session found for ID: ${sessionId}`,
      };
    }

    try {
      const result = await extractBrandFonts(session.page);
      return {
        ...result,
        success: true,
      };
    } catch (error) {
      const emptyFont = {
        fontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true,
      };
      return {
        headerFont: emptyFont,
        bodyFont: emptyFont,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract fonts",
      };
    }
  },
});
