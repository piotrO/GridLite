import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { chromium } from 'playwright';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import sharp from 'sharp';

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
async function createBrowserSession(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process"
    ]
  });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    permissions: ["geolocation"],
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    }
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
  await blocker.enableBlockingInPage(page);
  await navigateWithRetry(page, url);
  await page.waitForTimeout(2e3);
  return { browser, page };
}
async function navigateWithRetry(page, url, browser) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 3e4
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("ERR_HTTP2") || errorMessage.includes("ERR_CONNECTION")) {
      const urlObj = new URL(url);
      const altUrl = urlObj.hostname.startsWith("www.") ? url.replace("www.", "") : url.replace("://", "://www.");
      try {
        await page.goto(altUrl, {
          waitUntil: "domcontentloaded",
          timeout: 3e4
        });
        return;
      } catch {
        await page.goto(url, {
          waitUntil: "commit",
          timeout: 3e4
        });
      }
    } else {
      throw error;
    }
  }
}
async function captureScreenshot(page) {
  await page.evaluate(() => {
    document.body.style.zoom = "90%";
  });
  await page.waitForTimeout(500);
  const buffer = await page.screenshot({
    type: "png",
    fullPage: true
    // Capture full page
  });
  return sharp(buffer).resize({ width: 1280, withoutEnlargement: true }).toBuffer();
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
