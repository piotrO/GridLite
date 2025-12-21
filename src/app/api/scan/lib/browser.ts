import { chromium, Browser, Page } from "playwright";
import { PlaywrightBlocker } from "@ghostery/adblocker-playwright";

const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export interface BrowserSession {
    browser: Browser;
    page: Page;
}

/**
 * Launches a browser and navigates to the specified URL with ad blocking enabled.
 */
export async function createBrowserSession(
    url: string
): Promise<BrowserSession> {
    const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1920, height: 1080 },
        permissions: ["geolocation"],
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        locale: "en-US",
    });

    const page = await context.newPage();

    // Setup Ghostery adblocker - blocks trackers and cookie popups
    const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
    await blocker.enableBlockingInPage(page);

    // Navigate to the URL with domcontentloaded for faster results
    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
    });

    // Wait for dynamic content and hydration
    await page.waitForTimeout(2000);

    return { browser, page };
}

/**
 * Takes a screenshot of the current page viewport.
 */
export async function captureScreenshot(page: Page): Promise<Buffer> {
    return page.screenshot({
        type: "png",
        fullPage: false, // Top viewport only for better analysis
    });
}

/**
 * Safely closes the browser instance.
 */
export async function closeBrowser(browser: Browser | null): Promise<void> {
    if (browser) {
        try {
            await browser.close();
        } catch {
            // Ignore close errors
        }
    }
}
