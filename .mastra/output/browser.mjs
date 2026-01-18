import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { chromium } from 'playwright';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
async function createBrowserSession(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    permissions: ["geolocation"],
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
    locale: "en-US"
  });
  const page = await context.newPage();
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
  await blocker.enableBlockingInPage(page);
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 6e4
  });
  await page.waitForTimeout(2e3);
  return { browser, page };
}
async function captureScreenshot(page) {
  return page.screenshot({
    type: "png",
    fullPage: false
    // Top viewport only for better analysis
  });
}
async function closeBrowser(browser) {
  if (browser) {
    try {
      await browser.close();
    } catch {
    }
  }
}

const activeSessions = /* @__PURE__ */ new Map();
const browserSessionTool = createTool({
  id: "browser-session",
  description: "Launches a headless browser and navigates to a URL. Returns a session ID for use by other tools.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to navigate to")
  }),
  outputSchema: z.object({
    sessionId: z.string().describe("Unique session identifier"),
    success: z.boolean(),
    error: z.string().optional()
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
        error: error instanceof Error ? error.message : "Failed to create browser session"
      };
    }
  }
});
const closeBrowserTool = createTool({
  id: "close-browser",
  description: "Closes a browser session and releases resources",
  inputSchema: z.object({
    sessionId: z.string().describe("The session ID to close")
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async ({ context }) => {
    const session = activeSessions.get(context.sessionId);
    if (session) {
      await closeBrowser(session.browser);
      activeSessions.delete(context.sessionId);
    }
    return { success: true };
  }
});
function getSession(sessionId) {
  return activeSessions.get(sessionId);
}
async function cleanupSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    await closeBrowser(session.browser);
    activeSessions.delete(sessionId);
  }
}

export { cleanupSession as a, browserSessionTool as b, closeBrowserTool as c, captureScreenshot as d, createBrowserSession as e, closeBrowser as f, getSession as g };
