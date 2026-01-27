import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { extractWebsiteText } from "@/lib/scan/text-extractor";
import { getSession } from "./browser";

/**
 * Tool to extract clean text content from a webpage.
 * Removes navigation, footer, scripts, and other non-content elements.
 */
export const textExtractorTool = createTool({
  id: "text-extractor",
  description:
    "Extracts clean text content from a webpage, removing navigation, scripts, and non-content elements",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID"),
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted text content (max 15,000 chars)"),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        text: "",
        success: false,
        error: `No active session found for ID: ${context.sessionId}`,
      };
    }

    try {
      const text = await extractWebsiteText(session.page);
      return { text, success: true };
    } catch (error) {
      return {
        text: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract text",
      };
    }
  },
});
