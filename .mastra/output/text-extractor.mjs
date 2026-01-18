import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSession } from './browser.mjs';

async function extractWebsiteText(page) {
  const rawText = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    const selectorsToRemove = [
      "script",
      "style",
      "noscript",
      "svg",
      "iframe",
      "nav",
      "footer",
      "header",
      "[role='navigation']",
      "[role='banner']",
      "[role='contentinfo']",
      ".cookie-banner",
      ".cookie-consent",
      "#cookie-banner",
      ".nav",
      ".navigation",
      ".footer",
      ".header",
      ".sidebar",
      ".advertisement",
      ".ad",
      ".social-share"
    ];
    selectorsToRemove.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });
    const text = clone.innerText || clone.textContent || "";
    return text.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").trim();
  });
  const MAX_LENGTH = 15e3;
  if (rawText.length > MAX_LENGTH) {
    return rawText.slice(0, MAX_LENGTH) + "...";
  }
  return rawText;
}

const textExtractorTool = createTool({
  id: "text-extractor",
  description: "Extracts clean text content from a webpage, removing navigation, scripts, and non-content elements",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID")
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted text content (max 15,000 chars)"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        text: "",
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const text = await extractWebsiteText(session.page);
      return { text, success: true };
    } catch (error) {
      return {
        text: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract text"
      };
    }
  }
});

export { extractWebsiteText as e, textExtractorTool as t };
