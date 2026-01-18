import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSession } from './browser.mjs';

async function extractLogo(page, baseUrl) {
  const ogImage = await page.$eval('meta[property="og:image"]', (el) => el.getAttribute("content")).catch(() => null);
  if (ogImage) {
    return ogImage.startsWith("http") ? ogImage : new URL(ogImage, baseUrl).href;
  }
  const favicon = await page.$eval(
    'link[rel="icon"], link[rel="shortcut icon"]',
    (el) => el.getAttribute("href")
  ).catch(() => null);
  if (favicon) {
    return favicon.startsWith("http") ? favicon : new URL(favicon, baseUrl).href;
  }
  const logoImg = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const logoImage = imgs.find(
      (img) => img.className.toLowerCase().includes("logo") || img.alt?.toLowerCase().includes("logo")
    );
    return logoImage?.src || "";
  });
  return logoImg || null;
}

const logoExtractorTool = createTool({
  id: "logo-extractor",
  description: "Extracts the brand logo URL from a webpage using the active browser session",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID"),
    baseUrl: z.string().url().describe("Base URL for resolving relative paths")
  }),
  outputSchema: z.object({
    logoUrl: z.string().nullable().describe("Extracted logo URL or null if not found"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        logoUrl: null,
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const logoUrl = await extractLogo(session.page, context.baseUrl);
      return { logoUrl, success: true };
    } catch (error) {
      return {
        logoUrl: null,
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract logo"
      };
    }
  }
});

export { extractLogo as e, logoExtractorTool as l };
