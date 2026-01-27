import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  createBrowserSession,
  closeBrowser,
  BrowserSession,
} from "@/lib/scan/browser";

/**
 * In-memory store for active browser sessions.
 * This allows tools to share the same browser/page context.
 */
const activeSessions = new Map<string, BrowserSession>();

/**
 * Tool to launch a headless browser and navigate to a URL.
 * Creates a session that can be referenced by other tools.
 */
export const browserSessionTool = createTool({
  id: "browser-session",
  description:
    "Launches a headless browser and navigates to a URL. Returns a session ID for use by other tools.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to navigate to"),
  }),
  outputSchema: z.object({
    sessionId: z.string().describe("Unique session identifier"),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const session = await createBrowserSession(context.url);
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      activeSessions.set(sessionId, session);

      return { sessionId, success: true };
    } catch (error) {
      return {
        sessionId: "",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create browser session",
      };
    }
  },
});

/**
 * Tool to close a browser session and clean up resources.
 */
export const closeBrowserTool = createTool({
  id: "close-browser",
  description: "Closes a browser session and releases resources",
  inputSchema: z.object({
    sessionId: z.string().describe("The session ID to close"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const session = activeSessions.get(context.sessionId);
    if (session) {
      await closeBrowser(session.browser);
      activeSessions.delete(context.sessionId);
    }
    return { success: true };
  },
});

/**
 * Helper to get an active session by ID.
 * Used internally by other tools.
 */
export function getSession(sessionId: string): BrowserSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Helper to clean up a session.
 */
export async function cleanupSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    await closeBrowser(session.browser);
    activeSessions.delete(sessionId);
  }
}
