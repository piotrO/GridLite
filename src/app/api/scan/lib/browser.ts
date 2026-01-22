import { chromium, Browser, Page } from "playwright";
import { PlaywrightBlocker } from "@ghostery/adblocker-playwright";

const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface BrowserSession {
    browser: Browser;
    page: Page;
}

/**
 * Launches a browser and navigates to the specified URL with ad blocking enabled.
 * Includes retry logic with HTTP/1.1 fallback for sites that block HTTP/2 headless requests.
 */
export async function createBrowserSession(
    url: string
): Promise<BrowserSession> {
    const browser = await chromium.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
        ],
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
            "Upgrade-Insecure-Requests": "1",
        },
    });

    const page = await context.newPage();

    // Override webdriver detection
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    // Setup Ghostery adblocker - blocks trackers and cookie popups
    const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
    await blocker.enableBlockingInPage(page);

    // Navigate with retry logic for HTTP2 errors
    await navigateWithRetry(page, url, browser);

    // Wait for dynamic content and hydration
    await page.waitForTimeout(2000);

    return { browser, page };
}

/**
 * Attempts navigation with fallback strategies for problematic sites.
 */
async function navigateWithRetry(
    page: Page,
    url: string,
    browser: Browser
): Promise<void> {
    try {
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);

        // HTTP2 protocol errors - try with www prefix or different approach
        if (
            errorMessage.includes("ERR_HTTP2") ||
            errorMessage.includes("ERR_CONNECTION")
        ) {
            // Try adding www. if not present, or removing if present
            const urlObj = new URL(url);
            const altUrl = urlObj.hostname.startsWith("www.")
                ? url.replace("www.", "")
                : url.replace("://", "://www.");

            try {
                await page.goto(altUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                });
                return;
            } catch {
                // If still failing, try commit (partial load) instead
                await page.goto(url, {
                    waitUntil: "commit",
                    timeout: 30000,
                });
            }
        } else {
            throw error;
        }
    }
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
