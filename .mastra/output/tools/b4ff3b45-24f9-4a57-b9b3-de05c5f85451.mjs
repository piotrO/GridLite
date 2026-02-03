import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { e as extractBrandFonts } from '../font-extractor.mjs';
import { g as getSession } from '../browser.mjs';
import 'playwright';
import '@ghostery/adblocker-playwright';
import 'sharp';

const fontExtractorTool = createTool({
  id: "font-extractor",
  description: "Extracts the primary brand font family and file from a webpage",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID")
  }),
  outputSchema: z.object({
    primaryFontFamily: z.string().describe("The name of the primary font found"),
    fontFileBase64: z.string().nullable().describe("Base64 encoded font file"),
    fontFormat: z.enum(["woff2", "woff", "ttf", "otf"]).nullable().describe("Font file format"),
    isSystemFont: z.boolean().describe("True if no custom font file was found or matched"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        primaryFontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true,
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const result = await extractBrandFonts(session.page);
      return {
        ...result,
        success: true
      };
    } catch (error) {
      return {
        primaryFontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true,
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract fonts"
      };
    }
  }
});

export { fontExtractorTool };
