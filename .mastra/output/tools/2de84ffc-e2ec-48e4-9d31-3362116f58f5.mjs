import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSession, d as captureScreenshot } from '../browser.mjs';
import 'playwright';
import '@ghostery/adblocker-playwright';
import 'sharp';

const screenshotTool = createTool({
  id: "screenshot-capture",
  description: "Captures a screenshot of the current browser viewport for AI analysis",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID")
  }),
  outputSchema: z.object({
    screenshotBase64: z.string().describe("Base64-encoded PNG screenshot"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        screenshotBase64: "",
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const buffer = await captureScreenshot(session.page);
      return {
        screenshotBase64: buffer.toString("base64"),
        success: true
      };
    } catch (error) {
      return {
        screenshotBase64: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to capture screenshot"
      };
    }
  }
});

export { screenshotTool };
