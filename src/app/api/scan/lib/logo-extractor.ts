import { Page } from "playwright";

/**
 * Attempts to extract a logo URL from the page using multiple strategies:
 * 1. og:image meta tag
 * 2. Favicon link
 * 3. Image elements with "logo" in class/alt
 */
export async function extractLogo(
    page: Page,
    baseUrl: string
): Promise<string | null> {
    // Try og:image first
    const ogImage = await page
        .$eval('meta[property="og:image"]', (el) => el.getAttribute("content"))
        .catch(() => null);

    if (ogImage) {
        return ogImage.startsWith("http") ? ogImage : new URL(ogImage, baseUrl).href;
    }

    // Try favicon
    const favicon = await page
        .$eval('link[rel="icon"], link[rel="shortcut icon"]', (el) =>
            el.getAttribute("href")
        )
        .catch(() => null);

    if (favicon) {
        return favicon.startsWith("http")
            ? favicon
            : new URL(favicon, baseUrl).href;
    }

    // Try finding img with "logo" in class or alt
    const logoImg = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        const logoImage = imgs.find(
            (img) =>
                img.className.toLowerCase().includes("logo") ||
                img.alt?.toLowerCase().includes("logo")
        );
        return logoImage?.src || "";
    });

    return logoImg || null;
}
